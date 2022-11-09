const express = require('express');
const favicon = require('serve-favicon');
const app = express();

const teamData = require( './modules/teamdata' );

app.set('port', (process.env.PORT || 5000));
app.set('redirect_to', (process.env.REDIRECT_TO || false));

app.use((req, res, next) => {
    if ( app.get('redirect_to') && req.hostname !== app.get('redirect_to')){
        return res.redirect(301,'https://' + app.get('redirect_to') + req.originalUrl);
    }

    next();
});

app.use(express.static(__dirname + '/static'));

app.use(favicon(__dirname + '/static/images/noun_55243_cc.png'));

const calendar = require('./modules/calendar');
const average = require('./modules/average');

app.get('/calendar', async (req, res) => {
    let requestedTeams = [];
    if(req.query.team && Array.isArray(req.query.team)){
        requestedTeams = req.query.team;
    } else if (req.query.team){
        requestedTeams = [req.query.team];
    }

    requestedTeams = requestedTeams.filter(teamName => {
        const hasTeamData = teamData(teamName);

        if( !hasTeamData ){
            console.log(`Stripping unknown team ${teamName} from requested teams`);

            return false;
        }

        return true;
    });

    if(req.query.team && requestedTeams.length === 0) {
        res.sendStatus(404);

        return true;
    }

    const calendarString = await calendar(requestedTeams);

    if (req.query.team) {
        console.log(req.query.team);
    } else {
        console.log("no-filter");
    };

    if( req.query.download ){
        res.setHeader('Content-disposition', 'attachment; filename=hockey-mchockeyface.ics');
    }

    if(process.env.NODE_ENV !== 'development'){
        res.set('Content-Type', 'text/calendar');
    }

    res.send(calendarString);
});

app.get('/average', async (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(await average());
})

app.listen(app.get('port'), function () {
    console.log('Hockey McHockeyFace ready to serve on port', app.get('port'))
});
