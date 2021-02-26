const express = require('express');
const favicon = require('serve-favicon');
const app = express();

const teamData = require( './modules/teamdata' );

app.set('port', (process.env.PORT || 5000));
app.use(express.static('static'));
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

    res.set('Content-Type', 'text/calendar');
    res.send(calendarString);
});

app.get('/average', async (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(await average());
})

app.listen(app.get('port'), function () {
    console.log('Hockey McHockeyFace ready to serve on port', app.get('port'))
});
