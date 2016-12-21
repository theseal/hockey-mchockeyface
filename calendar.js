const https = require('follow-redirects').https
const fs = require('fs');
const tmp = require('tmp');
const util = require('util');
const readline = require('readline');

const url = "https://www.google.com/calendar/ical/hockeyligan.sverige@gmail.com/public/basic.ics";
const cached_ics = "/tmp/shl_ics";

const download = function(url, cb) {
    const tmpobj = tmp.fileSync();
    const dest = tmpobj.name;
    let fetch = true;
    let file_exists = false;

    if (fs.existsSync(cached_ics)) {
        file_exists = true;
        const stats = fs.statSync(cached_ics);
        const mtime = new Date(util.inspect(stats.mtime)).getTime() / 1000;
        const now = new Date().getTime() / 1000;
        const diff = now - 3600;

        if (diff < mtime ) {
            fetch = false;
        };
    };

    if (!fetch) {
        cb(null);
    } else {
        const file = fs.createWriteStream(dest);
        const request = https.get(url, function(response) {
            response.pipe(file);
            file.on('finish', function() {
                file.close( () => {
                    fs.rename(tmpobj.name,cached_ics);
                    cb(null);
                });
            });
        }).on('error', function(err) {
            fs.unlink(dest);
            if (cb) cb(err.message);
        });
    };
};

const calendar = (f,cb) => {
    const filter = [].concat(f);
    const re_array = [];
    let return_object = "";
    const newline = "\n";

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
        } else if ( team === "SAIK" ) {
            re_array.push("Skellefteå AIK");
        } else if ( team === "VLH" ) {
            re_array.push("Växjö Lakers");
        } else if ( team === "ÖRE" ) {
            re_array.push("Örebro Hockey");
        };
    });

    const global_re = re_array.join("|");

    download(url,(err) => {
        if (err) {
            cb(err);
        } else {
            const lineReader = readline.createInterface({
                input: fs.createReadStream(cached_ics)
            });

            let in_event = false;
            let complete_event = false;
            let event_data = [];
            let output = true;
            let print_event = false;
            lineReader.on('line', function (line) {
                output = true;
                if (line.match("^BEGIN:VEVENT")) {
                    in_event = true;
                    output = false;
                    print_event = false;
                }
                if (in_event) {
                    event_data.push(line);
                    output = false;
                }
                if (line.match("^END:VEVENT")) {
                    print_event = false;
                    in_event = false;
                    output = false;

                    event_data.forEach(function(entry) {
                        re = /^SUMMARY/;
                        if (entry.match(re)) {
                                if (entry.match(global_re)) {
                                    print_event = true;
                                };
                        };
                    });
                    if (print_event) {
                        event_data.forEach(function(entry) {
                            return_object += entry + newline;
                        });
                        print_event = false;
                    };
                    event_data = [];
                };

                if (output) {
                    return_object += line + newline;
                }
            });
            lineReader.on('close', () => {
                cb(null,return_object);
            });
        };
    });
};

module.exports = calendar;
