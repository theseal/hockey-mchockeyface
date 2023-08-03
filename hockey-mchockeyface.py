#!/usr/bin/env python3

import logging
import os
from urllib.parse import urlparse

from flask import Flask, Response, redirect, render_template, request, send_from_directory

from hockeyface import hockeyface

redirect_to = os.environ.get("REDIRECT_TO")

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
hf = hockeyface()


def ensure_domain(request):
    if redirect_to:
        requested_domain = urlparse(request.url).netloc
        path = urlparse(request.url).path
        query = urlparse(request.url).query
        if requested_domain != redirect_to:
            logger.debug(f"Creating direct from {requested_domain} to {redirect_to}")
            return redirect(f"https://{redirect_to}{path}?{query}", code=301)


@app.route("/")
def index_page():
    _redirect = ensure_domain(request)
    if _redirect:
        return _redirect

    return render_template("index.html")


@app.route("/favicon.ico")
def favicon():
    _redirect = ensure_domain(request)
    if _redirect:
        return _redirect
    return send_from_directory(os.path.join(app.root_path, "static"), "images/noun_55243_cc.png", mimetype="image/png")


@app.route("/calendar")
def calendar():
    _redirect = ensure_domain(request)
    if _redirect:
        return _redirect

    teams = request.args.getlist("team")
    leagues = request.args.getlist("league")
    # Default to SHL and HA to keep previous behavior
    if not leagues:
        leagues = ["SHL", "HA"]

    # Teams in SHL might attend in CHL
    if teams and "SHL" in leagues:
        leagues.append("CHL")

    events = hf.get_events(teams, leagues)
    ical = hf.build_ical(events, teams, leagues)

    response = Response(response=ical, status=200, mimetype="text/calendar")
    response.headers["Content-disposition"] = "attachment; filename=hockey-mchockeyface.ics"

    return response
