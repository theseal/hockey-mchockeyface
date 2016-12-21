#!/usr/bin/env node

const express = require('express');
const app = express();

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
        res.set('Content-Type', 'text/calendar');
        res.send(cal);
    });
});

app.listen(3000, function () {
    console.log('Hockey McHockeyFace ready to serve on port 3000!')
});
