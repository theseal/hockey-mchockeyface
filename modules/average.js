// DISCLAIMER: I have no idea what I'm doing 🐶

const shl_url = "https://www.shl.se";
const ha_url = "https://www.hockeyallsvenskan.se";

let league_dict = {};
league_dict["SHL"] = {
    "url": "https://www.shl.se/statistik/tabell?season=2021&gameType=regular",
    "plusminus": 9,
    "points": 10
};
league_dict["HA"] = {
    "url": "https://www.hockeyallsvenskan.se/statistik/tabell?season=2021&gameType=regular",
    "plusminus": 9,
    "points": 10
};


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
    const teamsTable = $( '.rmss_t-stat-table' );

    const teams = [];
    teamsTable.find("tr").each( ( index, element ) => {
        const $element = $( element );
        const name = $element.find( '.rmss_t--pinned-hide' ).first().text();
        if (name == ''){
            return;
        }

        const stats = $element.find( '.rmss_t-stat-table__row-item').map(function() {
            return $(this).text();
        }).toArray();
        const rank = stats[0];
        const games_played = stats[2];
        const plusminus = stats[league_dict[leauge]["plusminus"]];
        const points = stats[league_dict[leauge]["points"]];
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
