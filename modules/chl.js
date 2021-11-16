const got = require('got');
const ICAL = require('ical.js');

const teamData = require('./teamdata');

const CHL_URL = 'https://www.championshockeyleague.com/api/s3/live?q=live-events.json';

module.exports = async () => {
    const response = await got(CHL_URL, {
        responseType: 'json',
    });
    const scheduledGames = [];

    for(const game of response.body.data){
        const event = new ICAL.Component( 'vevent' );

        const homeData = teamData( game.teams.home.name );
        const awayData = teamData( game.teams.away.name );

        event.addPropertyWithValue( 'dtstamp', ICAL.Time.now() );
        event.addPropertyWithValue( 'summary', `${ game.teams.home.name } - ${ game.teams.away.name }` );

        const eventEnd = new Date(game.startDate);
        eventEnd.setHours(eventEnd.getHours() + 2)
        eventEnd.setMinutes(eventEnd.getMinutes() + 30);

        event.addPropertyWithValue( 'dtstart', game.startDate );
        event.addPropertyWithValue( 'dtend',  eventEnd.toISOString());
        event.addPropertyWithValue( 'description', `${ game.teams.home.name } - ${ game.teams.away.name }` );
        event.addPropertyWithValue( 'location', game.venue.name );
        event.addPropertyWithValue( 'url', `https://www.championshockeyleague.com/en${game.link.url}` );
        event.addPropertyWithValue( 'uid', game._entityId );

        scheduledGames.push( {
            event: event,
            home: homeData?.name || game.teams.home.name,
            away: awayData?.name || game.teams.away.name,
        } );
    }

    return scheduledGames;
};