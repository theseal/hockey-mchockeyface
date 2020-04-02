const ICAL = require( 'ical.js' );
const got = require( 'got' );
const Notifyy = require( 'node-notifyy' );

const teamData = require( './teamdata' );

const shl_url = "https://calendar.ramses.nu/calendar/66/show/shl.ics";
const ha_url = "https://calendar.ramses.nu/calendar/163/show/schema-19-20.ics";

let notifyy = new Notifyy( {
    users: process.env.NOTIFYY_USERS,
} );

let games = [];
let lastFetch = false;

const get_games_from_calendar = async function get_games_from_calendar( calendarURL ) {
    const calendarGames = [];
    const response = await got( calendarURL );
    const data = ICAL.parse( response.body );
    const component = new ICAL.Component( data );

    console.log( `Updating games from ${ calendarURL }` );

    component.getAllSubcomponents( 'vevent' ).forEach( ( vevent ) => {
        let summary = vevent.getFirstPropertyValue( 'summary' );
        const event = new ICAL.Component( 'vevent' );

        // Check if the summary contains a number prefixed by a space
        // Probably means it's a score
        if ( /\s\d/.test( summary ) ) {
            let matches = summary.match( /(.+?)\s\d/ );

            summary = matches[ 1 ].trim();
        }

        const [ home, away ] = summary.split( ' - ' );

        if( !home || !away ) {
            console.log( `Unable to parse ${ summary } as home & away, skipping` );

            return true;
        }

        event.addPropertyWithValue( 'dtstamp', ICAL.Time.now() );
        event.addPropertyWithValue( 'summary', `${ home } - ${ away }` );

        event.addPropertyWithValue( 'dtstart', vevent.getFirstPropertyValue( 'dtstart' ) );
        event.addPropertyWithValue( 'dtend', vevent.getFirstPropertyValue( 'dtend' ) );
        event.addPropertyWithValue( 'description', vevent.getFirstPropertyValue( 'description' ) );
        event.addPropertyWithValue( 'location', vevent.getFirstPropertyValue( 'location' ) );
        event.addPropertyWithValue( 'url', vevent.getFirstPropertyValue( 'url' ) );
        event.addPropertyWithValue( 'uid', vevent.getFirstPropertyValue( 'uid' ) );

        const homeData = teamData( home );
        const awayData = teamData( away );

        if ( !homeData ) {
            console.error( `Failed to parse ${ home } as a team, skipping` );

            notifyy.send( {
                title: 'Failed to parse team',
                message: `Failed to parse "${ home }" as a team in Hockey McHockeyFace`,
            } );

            return true;
        }

        if ( !awayData ) {
            console.error( `Failed to parse ${ away } as a team, skipping` );

            notifyy.send( {
                title: 'Failed to parse team',
                message: `Failed to parse "${ away }" as a team in Hockey McHockeyFace`,
            } );

            return true;
        }

        calendarGames.push( {
            event: event,
            home: homeData.name,
            away: awayData.name,
        } );
    } );

    return calendarGames;
}

const get_games = async () => {
    const haGames = await get_games_from_calendar( ha_url );
    const shlGames = await get_games_from_calendar( shl_url );

    games = haGames.concat( shlGames );
};

const update_games = function() {
    const now = new Date().getTime() / 1000;
    const diff = now - 3600;

    if ( diff < lastFetch ) {
        return Promise.resolve();
    };

    lastFetch = new Date().getTime() / 1000;

    return get_games();
};

const calendar = async (teams) => {
    const filter = [].concat(teams);
    const calendar = new ICAL.Component( 'vcalendar' );
    let include_teams = filter.map((team) => {
        const tempData = teamData( team );

        return tempData.name;
    });

    if (include_teams.length === 0) {
        const allTeams = teamData();

        include_teams = allTeams.map((team) => {
            return team.name;
        });
    }

    calendar.addPropertyWithValue( 'prodid', '-//Hockey McHF//Hockey McHockeyFace//EN' );
    calendar.addPropertyWithValue( 'version', '2.0' );
    calendar.addPropertyWithValue( 'calscale', 'GREGORIAN' );
    calendar.addPropertyWithValue( 'x-wr-timezone', 'Europe/Stockholm' );
    calendar.addPropertyWithValue( 'x-wr-calname', 'Svensk hockey' );
    calendar.addPropertyWithValue( 'x-wr-caldesc', 'Spelschema för svensk hockey' );

    if(filter.length === 1 && filter[0]){
        calendar.updatePropertyWithValue( 'x-wr-calname', include_teams[ 0 ] );
        calendar.updatePropertyWithValue( 'x-wr-caldesc', `Spelschema för ${ include_teams[ 0 ] }` );
    }

    await update_games();

    if (games.length <= 0) {
        console.error( `Failed to load games for ${ teams } as requested` );

        notifyy.send( {
            title: 'Failed to load games',
            message: `Failed to load games for ${ teams } as requested in Hockey McHockeyFace`,
        } );
    }

    for (let i = 0; i < games.length; i = i + 1) {
        if ( include_teams.includes( games[ i ].home ) || include_teams.includes( games[ i ].away ) ) {
            calendar.addSubcomponent( games[ i ].event );
        }
    }

    return calendar.toString();
};

module.exports = calendar;
