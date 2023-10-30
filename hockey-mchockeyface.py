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


@app.route("/feed")
def feed():
    import requests
    import re
    from feedgen.feed import FeedGenerator

    team_store = {
        "LIF": {
            "url": "https://www.leksandsif.se/api/articles/site-news/list?pagesize=15",
            "name": "Leksands IF",
            "title": "leksandsif.se",
            "href": "https://www.leksandsif.se",
            "desc": "Länkar till ariklar på Leksandsif.se",
        }
    }
    team = request.args.get("team")
    labels_to_skip = request.args.getlist("labelToSkip")

    url = team_store[team]["url"]

    if team not in team_store:
        response = Response(status=400)
        return response

    fg = FeedGenerator()
    fg.id(f"Hockeyface {team}")
    fg.link(href=team_store[team]["href"])
    fg.title(team_store[team]["title"])
    fg.description(team_store[team]["desc"])

    r = requests.get(url)
    returned_json = r.json()
    for article in reversed(returned_json["data"]["articleItems"]):
        if "label" in article["metadata"]:
            if article["metadata"]["label"] in labels_to_skip:
                continue
        fe = fg.add_entry()
        fe.id(article["id"])
        fe.title(article["header"])
        description = re.sub(r"\\n", "\n", article["intro"]).strip('"')
        fe.description(description)
        fe.published(article["publishedAt"])
        fe.link(href=f"{team_store[team]['href']}/article/{article['id']}/view")

    response = Response(
        response=fg.rss_str(pretty=True), status=200, mimetype="text/calendar"
    )
    return response
