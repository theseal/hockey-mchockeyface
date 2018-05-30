const ICAL = require( 'ical.js' );
const request = require("request");
const cheerio = require("cheerio");
const moment = require('moment-timezone');

const shl_url = "http://www.shl.se/calendar/66/show/shl.ics";
const ha_url = "http://www.hockeyallsvenskan.se/spelschema/HA_2018_regular";
const momentFormat = 'YYYY-MM-DDTHH:mm:ss';

let ha_games = [];
let shl_games = [];

let lastFetch = false;

const normaliseName = function normaliseName( name ) {
    switch ( name ) {
        case 'AIK':
            return 'AIK';
        case 'AIS':
        case 'Almtuna':
            return 'Almtuna IS';
        case 'IFB':
            return 'Björklöven';
        case 'BIK':
        case 'Karlskoga':
            return 'BIK Karlskoga';
        case 'BIF':
            return 'Brynäs IF';
        case 'DIF':
        case 'Djurgården Hockey':
            return 'Djurgården';
        case 'FHC':
            return 'Frölunda HC';
        case 'FBK':
            return 'Färjestad BK';
        case 'VIT':
        case 'Vita Hästen':
            return 'HC Vita Hästen';
        case 'HV71':
        case 'HV':
            return 'HV71';
        case 'TRO':
        case 'Troja/Ljungby':
            return 'IF Troja-Ljungby';
        case 'IKO':
        case 'Oskarshamn':
            return 'IK Oskarshamn';
        case 'PAN':
        case 'Pantern':
            return 'IK Pantern';
        case 'KHK':
            return 'Karlskrona HK';
        case 'LHC':
            return 'Linköping HC';
        case 'LHF':
            return 'Luleå Hockey';
        case 'MIF':
            return 'Malmö Redhawks';
        case 'MODO':
            return 'MODO Hockey';
        case 'MIK':
            return 'Mora IK';
        case 'LIF':
        case 'Leksand':
            return 'Leksands IF';
        case 'RBK':
            return 'Rögle BK';
        case 'SKE':
        case 'SAIK':
            return 'Skellefteå AIK';
        case 'SSK':
        case 'Södertälje':
            return 'Södertälje SK';
        case 'TIK':
        case 'Timrå':
            return 'Timrå IK';
        case 'TAIF':
        case 'Tingsryd':
            return 'Tingsryds AIF';
        case 'VIK':
        case 'VIK Västerås HK':
            return 'Västerås';
        case 'VVIK':
        case 'Västervik':
            return 'Västerviks IK';
        case 'VLH':
            return 'Växjö Lakers';
        case 'ÖRE':
            return 'Örebro Hockey';
        default:
            return name;
    };
};

const get_ha_games = () => {
    return new Promise( ( resolve, reject ) => {
        request( ha_url, ( error, response, body ) => {
            if ( error ) {
                reject( error );
                return false;
            }

            const $ = cheerio.load( body, {
                decodeEntities: false,
            } );
            const gamesHtml = $( '.rmss_c-schedule-game__row-wrapper' );
            ha_games = [];

            gamesHtml.each( ( index, element ) => {
                const $element = $( element );

                // Skip played games
                if ( $element.data( 'game-mode' ) === 'played' ) {
                    return true;
                }

                const date = $element.data( 'game-date' );
                const time = $element.find( '.rmss_c-schedule-game__live-info' ).first().text();
                const start_date_string = `${ date } ${ time }`;

                if ( !moment( start_date_string, 'YYYY-MM-DD HH:mm', true ).isValid() ) {
                    return true;
                }

                const start_date = moment.tz( start_date_string, 'Europe/Stockholm');
                const end_date = moment( start_date ).add( 150, 'minutes' );

                const game = $element.find( '.rmss_c-schedule-game__info__round-number' ).text().match( /\d+/g )[ 0 ];

                let home = $element.find( '.rmss_c-schedule-game__team.is-home-team .rmss_c-schedule-game__team-name' ).first().text();
                let away = $element.find( '.rmss_c-schedule-game__team.is-away-team .rmss_c-schedule-game__team-name' ).first().text();
                home = normaliseName( home );
                away = normaliseName( away );

                const event = new ICAL.Component( 'vevent' );
                event.addPropertyWithValue( 'uid', `${ game }-${ home }-${ away }` );
                event.addPropertyWithValue( 'summary', `${ home } - ${ away }` );
                event.addPropertyWithValue( 'description', `Omgång ${ game }` );
                event.addPropertyWithValue( 'dtstart', ICAL.Time.fromString( start_date.format( momentFormat ) ) );
                event.addPropertyWithValue( 'dtend', ICAL.Time.fromString( end_date.format( momentFormat ) ) );
                event.addPropertyWithValue( 'dtstamp', ICAL.Time.now() );

                ha_games.push( {
                    event: event,
                    home: home,
                    away: away,
                } );
            } );

            resolve();

            return true;
        });

        return true;
    });
};

const get_shl_games = () => {
    return new Promise( ( resolve, reject ) => {
        request( shl_url, ( error, response, body ) => {
            if ( error ) {
                reject( error );

                return false;
            }
            const shl_data = ICAL.parse( body );
            const component = new ICAL.Component( shl_data );

            shl_games = [];
            component.getAllSubcomponents( 'vevent' ).forEach( ( vevent ) => {
                let summary = vevent.getFirstPropertyValue( 'summary' );

                // Check if the summary contains a number
                // Probably means it's a score
                if ( /\d/.test( summary ) ) {
                    let matches = summary.match( /(.+?)\d/ );

                    summary = matches[ 1 ].trim();
                }

                const [ home, away ] = summary.split( ' - ' );
                const event = new ICAL.Component( 'vevent' );

                event.addPropertyWithValue( 'dtstamp', ICAL.Time.now() );
                event.addPropertyWithValue( 'summary', `${ home } - ${ away }` );

                event.addPropertyWithValue( 'dtstart', vevent.getFirstPropertyValue( 'dtstart' ) );
                event.addPropertyWithValue( 'dtend', vevent.getFirstPropertyValue( 'dtend' ) );
                event.addPropertyWithValue( 'description', vevent.getFirstPropertyValue( 'description' ) );
                event.addPropertyWithValue( 'location', vevent.getFirstPropertyValue( 'location' ) );
                event.addPropertyWithValue( 'url', vevent.getFirstPropertyValue( 'url' ) );
                event.addPropertyWithValue( 'uid', vevent.getFirstPropertyValue( 'uid' ) );

                shl_games.push( {
                    event: event,
                    home: normaliseName( home ),
                    away: normaliseName( away ),
                } );
            } );

            resolve();

            return true;
        });

        return true;
    } );
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
        updates.push( get_shl_games() );
        updates.push( get_ha_games() );

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
    const include_teams = [];
    const calendar = new ICAL.Component( 'vcalendar' );
    calendar.addPropertyWithValue( 'prodid', '-//Hockey McHF//Hockey McHockeyFace//EN' );
    calendar.addPropertyWithValue( 'version', '2.0' );
    calendar.addPropertyWithValue( 'calscale', 'GREGORIAN' );
    calendar.addPropertyWithValue( 'x-wr-timezone', 'Europe/Stockholm' );

    filter.forEach(function(team) {
        include_teams.push( normaliseName( team ) );
    });

    calendar.addPropertyWithValue( 'x-wr-calname', 'Svensk hockey' );
    calendar.addPropertyWithValue( 'x-wr-caldesc', 'Spelschema för svensk hockey' );

    if( filter.length === 1 && filter[0]){
        calendar.updatePropertyWithValue( 'x-wr-calname', include_teams[ 0 ] );
        calendar.updatePropertyWithValue( 'x-wr-caldesc', `Spelschema för ${ include_teams[ 0 ] }` );
    }

    update_games()
        .then( () => {
            for ( let i = 0; i < shl_games.length; i = i + 1 ) {
                if ( include_teams.includes( shl_games[ i ].home ) || include_teams.includes( shl_games[ i ].away ) ) {
                    calendar.addSubcomponent( shl_games[ i ].event );
                }
            }

            for ( let i = 0; i < ha_games.length; i = i + 1 ) {
                if ( include_teams.includes( ha_games[ i ].home ) || include_teams.includes( ha_games[ i ].away ) ) {
                    calendar.addSubcomponent( ha_games[ i ].event );
                }
            }

            cb( null, calendar.toString() );
        } )
        .catch( ( someError ) => {
            console.error( someError );
        } );
};

module.exports = calendar;
