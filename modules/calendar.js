const ICAL = require( 'ical.js' );
const request = require("request");

const teamData = require( './teamdata' );

const shl_url = "https://calendar.ramses.nu/calendar/66/show/shl.ics";
const ha_url = "https://calendar.ramses.nu/calendar/163/show/schema-19-20.ics";

let games = [];

let lastFetch = false;

const get_games = () => {
    games = [];

    const urlArray = [ ha_url, shl_url]

    urlArray.forEach(function(url) {
        return new Promise( ( resolve, reject ) => {
            request( url, ( error, response, body ) => {
                if ( error ) {
                    reject( error );

                    return false;
                }
                const data = ICAL.parse( body );
                const component = new ICAL.Component( data );

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

                    if( !home || !away ) {
                        console.log( `Unable to parse ${ summary } as home & away, skipping` );

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

                    games.push( {
                        event: event,
                        home: homeData.name,
                        away: awayData.name,
                    } );
                } );

                resolve();

                return true;
            });

            return true;
        } );
    });
};

const update_games = function() {
    return new Promise( ( resolve, reject ) => {
        let fetch = true;

        const now = new Date().getTime() / 1000;
        const diff = now - 3600;

        if ( diff < lastFetch ) {
            resolve();

            return true;
        };

        lastFetch = new Date().getTime() / 1000;

        const updates = [];
        updates.push( get_games() );

        Promise.all( updates )
            .then( () => {
                resolve();
            })
            .catch( ( someError ) => {
                reject( someError );
            });
    });
};

const calendar = (f,cb) => {
    const filter = [].concat(f);
    const calendar = new ICAL.Component( 'vcalendar' );
    let include_teams = [];

    calendar.addPropertyWithValue( 'prodid', '-//Hockey McHF//Hockey McHockeyFace//EN' );
    calendar.addPropertyWithValue( 'version', '2.0' );
    calendar.addPropertyWithValue( 'calscale', 'GREGORIAN' );
    calendar.addPropertyWithValue( 'x-wr-timezone', 'Europe/Stockholm' );

    filter.forEach(function(team) {
        const tempData = teamData( team );
        include_teams.push( tempData.name );
    });

    if ( include_teams.length === 0 ) {
        const allTeams = teamData();

        include_teams = allTeams.map( ( team ) => {
            return team.name;
        } );
    }

    calendar.addPropertyWithValue( 'x-wr-calname', 'Svensk hockey' );
    calendar.addPropertyWithValue( 'x-wr-caldesc', 'Spelschema för svensk hockey' );

    if( filter.length === 1 && filter[0]){
        calendar.updatePropertyWithValue( 'x-wr-calname', include_teams[ 0 ] );
        calendar.updatePropertyWithValue( 'x-wr-caldesc', `Spelschema för ${ include_teams[ 0 ] }` );
    }

    update_games()
        .then( () => {
            for ( let i = 0; i < games.length; i = i + 1 ) {
                if ( include_teams.includes( games[ i ].home ) || include_teams.includes( games[ i ].away ) ) {
                    calendar.addSubcomponent( games[ i ].event );
                }
            }

            cb( null, calendar.toString() );
        } )
        .catch( ( someError ) => {
            console.error( someError );
        } );
};

module.exports = calendar;
