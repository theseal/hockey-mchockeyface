// DISCLAIMER: I have no idea what I'm doing 🐶

const shl_url = "https://www.shl.se";
const ha_url = "https://www.hockeyallsvenskan.se";

let league_dict = {};
league_dict["SHL"] = { "url": "https://www.shl.se" };
league_dict["HA"] = { "url": "https://www.hockeyallsvenskan.se" };


const cheerio = require("cheerio");
const got = require('got');

const average = async () => {
    let output = "Average standings for SHL and HA to easier understand this COVID-19 season.\n";
    output += "The current position in parentheses.\n";
    let response;

    for (let leauge in league_dict){
        output += `\n${leauge}:\n`
        url = league_dict[leauge]["url"];
        const dict = {};
        const array = [];

    try {
        response = await got(url);
    } catch (error) {
        console.log(error);
    }

    const $ = cheerio.load(response.body, {
        decodeEntities: false,
    } );
    const teamsTable = $( '.rmss_t-team-statistics' );

    teamsTable.find("tr").each( ( index, element ) => {
        const $element = $( element );
        const name = $element.find( '.rmss_t-team-statistics__name-long' ).first().text();
        if (name == ''){
            return;
        }

        const rank = $element.find( '.rmss_t-styled__team-rank' ).first().text();
        const stats = $element.find( '.rmss_t-team-statistics__data').map(function() {
            return $(this).text();
        }).toArray();
        const games_played = stats[0];
        const plusminus = stats[1];
        const points = stats[2];
        const average = (points / games_played).toFixed(2);
        const dict_local = {};
        dict_local[name] = {
            "rank": rank,
            "games_played": games_played,
            "plusminus": plusminus,
            "points": points,
            "average": average
        };
        dict[name] = {
            "rank": rank,
            "games_played": games_played,
            "plusminus": plusminus,
            "points": points,
            "average": average
        };
        array.push(dict_local);
    });
    const sorted = array
        .map(x => Object.entries(x)[0])
        .sort((a, b) => b[1].average - a[1].average)
        .map(x => x[0]);

    let count = 1;

    for (let i in sorted) {
        output = `${output}${count.toString().padEnd(3, ' ')}`;
        output = `${output}${sorted[i].padEnd(17, ' ')}\t`;
        output += `${dict[sorted[i]]["points"]} points    ${dict[sorted[i]]["games_played"]} games    average ${dict[sorted[i]]["average"]}    (${dict[sorted[i]]["rank"]})\n`;
        count++;
    }

};
    output += "\n\nPatches are welcome: https://github.com/theseal/hockey-mchockeyface\n";
    output += "https://hockey-mchockeyface.herokuapp.com";
    return output;
};

module.exports = average;
