const http = require('http');

const fs = require('fs');
const util = require('util');
const readline = require('readline');
const stream = require('stream');

const url = "http://www.shl.se/calendar/66/show/shl.ics";
let icalData = false;
let lastFetch = false;

const download = function(url, cb) {
    let fetch = true;

    if (icalData) {
        const now = new Date().getTime() / 1000;
        const diff = now - 3600;

        if (diff < lastFetch ) {
            fetch = false;
        };
    };

    if (!fetch) {
        cb(null);
    } else {
        const request = http.get(url, function(response) {
            let bufferData = [];

            response.on( 'data', ( chunk ) => {
                bufferData.push( chunk );
            });

            response.on('end', () => {
                icalData = Buffer.concat( bufferData );
                lastFetch = new Date().getTime() / 1000;
                cb(null);
            });
        }).on('error', function(err) {
            if (cb) {
                cb(err);

                return false;
            }
        });
    };
};

const calendar = (f,cb) => {
    const filter = [].concat(f);
    const re_array = [];
    const newline = "\r\n";
    let return_object = `BEGIN:VCALENDAR${ newline }PRODID:-//Google Inc//Google Calendar//EN${ newline }VERSION:2.0${ newline }CALSCALE:GREGORIAN${ newline }X-WR-TIMEZONE:Europe/Stockholm${ newline }`;
    let calendarName = 'SHL';
    let calendarDesc = 'Spelschema för SHL';

    filter.forEach(function(team) {
        if (team === "BIF") {
            re_array.push("Brynäs IF");
        } else if ( team === "DIF" ) {
            re_array.push("Djurgården");
        } else if ( team === "FHC" ) {
            re_array.push("Frölunda HC");
        } else if ( team === "FBK" ) {
            re_array.push("Färjestad BK");
        } else if ( team === "HV71" ) {
            re_array.push("HV71");
        } else if ( team === "KHK" ) {
            re_array.push("Karlskrona HK");
        } else if ( team === "LIF" ) {
            re_array.push("Leksands IF");
        } else if ( team === "LHC" ) {
            re_array.push("Linköping HC");
        } else if ( team === "LHF" ) {
            re_array.push("Luleå Hockey");
        } else if ( team === "MIF" ) {
            re_array.push("Malmö Redhawks");
        } else if ( team === "RBK" ) {
            re_array.push("Rögle BK");
        } else if ( team === "SKE"  || team === "SAIK") {
            re_array.push("Skellefteå AIK");
        } else if ( team === "VLH" ) {
            re_array.push("Växjö Lakers");
        } else if ( team === "ÖRE" ) {
            re_array.push("Örebro Hockey");
        };
    });

    if( filter.length === 1 ){
        calendarName = re_array[ 0 ];
        calendarDesc = `Spelschema för ${ re_array[ 0 ] }`;
    }

    return_object = `${ return_object }X-WR-CALNAME:${ calendarName }${ newline }`;
    return_object = `${ return_object }X-WR-CALDESC:${ calendarDesc }${ newline }`;

    const global_re = re_array.join("|");

    download(url, (err) => {
        if (err) {
            cb(err);

            return false;
        }

        let readStream = new stream.PassThrough();
        readStream.end( icalData );

        const lineReader = readline.createInterface({
            input: readStream
        });

        let in_event = false;
        let event_data = [];
        let print_event = false;

        lineReader.on('line', (line) => {
            if (line.match("^BEGIN:VEVENT")) {
                in_event = true;
                event_data = [];
            }

            if (in_event) {
                event_data.push(line);
            }

            if (line.match("^END:VEVENT")) {
                print_event = false;
                in_event = false;

                event_data.forEach(function(entry) {
                    re = /^SUMMARY/;
                    if (entry.match(re) && entry.match(global_re)) {
                        print_event = true;
                    };
                });

                if (print_event) {
                    event_data.forEach(function(entry) {
                        return_object += entry + newline;
                    });
                };
            };
        });

        lineReader.on('close', () => {
            return_object = `${ return_object }END:VCALENDAR`;

            cb(null, return_object);
        });

        lineReader.on('error', ( error ) => {
            cb(error);
        });
    });
};

module.exports = calendar;
