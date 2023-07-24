#!/usr/bin/env python3

import logging
import os

from flask import Flask, Response, render_template, request, send_from_directory

from hockeyface import hockeyface

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
hf = hockeyface()


@app.route("/")
def index_page():
    return render_template("index.html")


@app.route("/favicon.ico")
def favicon():
    return send_from_directory(os.path.join(app.root_path, "static"), "images/noun_55243_cc.png", mimetype="image/png")


@app.route("/calendar")
def calendar():
    teams = request.args.getlist("team")
    events = hf.get_events(teams)
    ical = hf.build_ical(events, teams)

    response = Response(response=ical, status=200, mimetype="text/calendar")
    response.headers["Content-disposition"] = "attachment; filename=hockey-mchockeyface.ics"

    return response
