const http = require('http');

const fs = require('fs');
const util = require('util');
const readline = require('readline');
const stream = require('stream');

const request = require("request");
const cheerio = require("cheerio");
const cheerioTableparser = require('cheerio-tableparser');
const moment = require('moment-timezone');

const shl_url = "http://www.shl.se/calendar/66/show/shl.ics";
const ha_url = "http://www.hockeyallsvenskan.se/matcher/spelschema";
const ha_table = ".esGameSchedule";
const newline = "\r\n";

let icalData = false;
let lastFetch = false;

const ha_download = function( cb ) {
    let return_object;
    request(ha_url, function(error, response, body) {
        var data = [];
        $ = cheerio.load(body,{ decodeEntities: false });
        cheerioTableparser($);
        var array = $(ha_table).parsetable(false, false, false);
        const re = new RegExp("^( |Datum)$");

        // 20180302T190000Z
        const momentFormat = 'YYYYMMDDTHHmmss[Z]';

        array[0].forEach(function(d, i) {
            const game = array[0][i];
            if (re.test(game)) {
                return false;
            };
            const date = array[2][i];
            if (re.test(date)){
                return false;
            };

            const start_date = moment.tz(date, "Europe/Stockholm");
            const end_date = moment( start_date ).add( 150, 'minutes' );

            const home = array[4][i];
            const away = array[6][i];

            var row = {
                "game": game,
                "start_date": start_date.utc().format( momentFormat ),
                "end_date": end_date.utc().format( momentFormat ),
                "home": home,
                "away": away,
            };

            data.push(row);
        })

        data.forEach(function(value) {
            const game = value.game;
            const start_date = value.start_date;
            const end_date = value.end_date;
            const home = value.home;
            const away = value.away;
            return_object += `BEGIN:VEVENT${newline}UID:${start_date}@${home}${newline}SUMMARY:${home} - ${away}${newline}DESCRIPTION:Omgång ${game}${ newline }DTSTART:${start_date}${newline}DTEND:${end_date}${ newline }END:VEVENT${newline}`;
        });

        cb( null, return_object );
    });
};


const download = function(shl_url, cb) {
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
        const request = http.get(shl_url, function(response) {
            let bufferData = [];

            response.on( 'data', ( chunk ) => {
                bufferData.push( chunk );
            });

            response.on('end', function() {
                ha_download( function(error, data) {
                    icalData = `${Buffer.concat( bufferData )}${data}`;
                    lastFetch = new Date().getTime() / 1000;
                    cb(null);
                });
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
    let return_object = `BEGIN:VCALENDAR${ newline }PRODID:-//Hockey McHF//Hockey McHockeyFace//EN${ newline }VERSION:2.0${ newline }CALSCALE:GREGORIAN${ newline }X-WR-TIMEZONE:Europe/Stockholm${ newline }`;
    let shl = false;
    let ha = false;

    filter.forEach(function(team) {
        // SHL
        if (team === "BIF") {
            re_array.push("Brynäs IF");
            shl = true;
        } else if ( team === "DIF" ) {
            re_array.push("Djurgården");
            shl = true;
        } else if ( team === "FHC" ) {
            re_array.push("Frölunda HC");
            shl = true;
        } else if ( team === "FBK" ) {
            re_array.push("Färjestad BK");
            shl = true;
        } else if ( team === "HV71" ) {
            re_array.push("HV71");
            shl = true;
        } else if ( team === "KHK" ) {
            re_array.push("Karlskrona HK");
            shl = true;
        } else if ( team === "LHC" ) {
            re_array.push("Linköping HC");
            shl = true;
        } else if ( team === "LHF" ) {
            re_array.push("Luleå Hockey");
            shl = true;
        } else if ( team === "MIF" ) {
            re_array.push("Malmö Redhawks");
            shl = true;
        } else if ( team === "MIK" ) {
            re_array.push("Mora IK");
            shl = true;
        } else if ( team === "RBK" ) {
            re_array.push("Rögle BK");
            shl = true;
        } else if ( team === "SKE"  || team === "SAIK") {
            re_array.push("Skellefteå AIK");
            shl = true;
        } else if ( team === "VLH" ) {
            re_array.push("Växjö Lakers");
            shl = true;
        } else if ( team === "ÖRE" ) {
            re_array.push("Örebro Hockey");
            shl = true;
        // HA
        } else if ( team === "AIK" ) {
            re_array.push("AIK");
            ha = true;
        } else if ( team === "AIS" ) {
            re_array.push("Almtuna IS");
            ha = true;
        } else if ( team === "IFB" ) {
            re_array.push("Björklöven");
            ha = true;
        } else if ( team === "BIK" ) {
            re_array.push("BIK Karlskoga");
            ha = true;
        } else if ( team === "VIT" ) {
            re_array.push("HC Vita Hästen");
            ha = true;
        } else if ( team === "TRO" ) {
            re_array.push("IF Troja-Ljungby");
            ha = true;
        } else if ( team === "IKO" ) {
            re_array.push("IK Oskarshamn");
            ha = true;
        } else if ( team === "PAN" ) {
            re_array.push("IK Pantern");
            ha = true;
        } else if ( team === "MODO" ) {
            re_array.push("MODO Hockey");
            ha = true;
        } else if ( team === "LIF" ) {
            re_array.push("Leksands IF");
            ha = true;
        } else if ( team === "SSK" ) {
            re_array.push("Södertjälje SK");
            ha = true;
        } else if ( team === "TIK" ) {
            re_array.push("Timrå IK");
            ha = true;
        } else if ( team === "TAIF" ) {
            re_array.push("Tingsryds AIF");
            ha = true;
        } else if ( team === "VVIK" ) {
            re_array.push("Västerviks IK");
            ha = true;
        };
    });

    let calendarName;
    let calendarDesc;

    if (shl && ! ha) {
        calendarName = 'SHL';
        calendarDesc = 'Spelschema för SHL';
    } else if (ha && ! shl) {
        calendarName = 'HA';
        calendarDesc = 'Spelschema för HA';
    } else {
        calendarName = 'Svensk hockey';
        calendarDesc = 'Spelschema för svensk hockey';
    };

    if( filter.length === 1 && filter[0]){
        calendarName = re_array[ 0 ];
        calendarDesc = `Spelschema för ${ re_array[ 0 ] }`;
    }

    return_object = `${ return_object }X-WR-CALNAME:${ calendarName }${ newline }`;
    return_object = `${ return_object }X-WR-CALDESC:${ calendarDesc }${ newline }`;

    const global_re = re_array.join("|");

    download(shl_url, (err) => {
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
