const express = require('express');
const favicon = require('serve-favicon');
const app = express();

const teamData = require( './modules/teamdata' );

app.set('port', (process.env.PORT || 5000));
app.use(express.static('static'));
app.use(favicon(__dirname + '/static/images/noun_55243_cc.png'));

const calendar = require('./modules/calendar');

app.get('/calendar', async (req, res) => {
    if(req.query.team && !teamData(req.query.team)) {
        res.sendStatus(404);

        return true;
    }
    const calendarString = await calendar(req.query.team || [] );

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

app.listen(app.get('port'), function () {
    console.log('Hockey McHockeyFace ready to serve on port', app.get('port'))
});
