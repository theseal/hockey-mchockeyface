#!/usr/bin/env python3

import logging

from flask import Flask, Response, render_template, request

from hockeyface import hockeyface

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
hf = hockeyface()


@app.route("/")
def index_page():
    return render_template("index.html")


@app.route("/calendar")
def calendar():
    teams = request.args.getlist("team")
    events = hf.get_events(teams)
    ical = hf.build_ical(events, teams)

    response = Response(response=ical, status=200, mimetype="text/calendar")
    response.headers["Content-disposition"] = "attachment; filename=hockey-mchockeyface.ics"

    return response
