#!/usr/bin/env node

const express = require('express');
const app = express();

app.set('port', (process.env.PORT || 5000));

app.get('/', function (req, res) {
    console.log("/");
    res.sendFile(__dirname + '/static/index.html');
});

const calendar = require('./calendar.js');

app.get('/calendar', (req, res) => {
    calendar(req.query.team,(err,cal) => {
        if (req.query.team) {
            console.log(req.query.team);
        } else {
            console.log("no-filter");
        };
        res.setHeader('Content-disposition', 'attachment; filename=hockey-mchockeyface.ics');
        res.set('Content-Type', 'text/calendar');
        res.send(cal);
    });
});

app.listen(app.get('port'), function () {
    console.log('Hockey McHockeyFace ready to serve on port', app.get('port'))
});
