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

    try {
        response = await got(url);
    } catch (error) {
        console.log(error);
    }

    const $ = cheerio.load(response.body, {
        decodeEntities: false,
    } );
    const teamsTable = $( '.rmss_t-team-statistics' );

    const teams = [];
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

        teams.push({
            "name": name,
            "rank": rank,
            "games_played": games_played,
            "plusminus": plusminus,
            "points": points,
            "average": average
        });

    });

    teams.sort((a, b) => {
        return b.average - a.average
    });

    let rank = 1;
    for (let team of teams) {
        output = `${output}${rank.toString().padEnd(3, ' ')}`;
        output = `${output}${team.name.padEnd(17, ' ')}\t`;
        output += `${team["points"]} points    ${team["games_played"]} games    average ${team["average"]}    (${team["rank"]})\n`;
        rank += 1;
    };
};
    output += "\n\nPatches are welcome: https://github.com/theseal/hockey-mchockeyface\n";
    output += "https://hockey-mchockeyface.herokuapp.com";
    return output;
};

module.exports = average;
