#!/usr/bin/env python3

import sys
import time
import re
import arrow

from ics import Calendar
import requests
import sqlite3
from oauthlib.oauth2 import BackendApplicationClient
from requests_oauthlib import OAuth2Session
from requests.auth import HTTPBasicAuth
import teamdata
import os

connection = sqlite3.connect("db.sql")
cursor = connection.cursor()
cursor.execute("CREATE TABLE IF NOT EXISTS games (home, away, start_time,venue,leage,ticket_url)")

#client_id=os.environ['client_id']
#client_secret=os.environ['client_secret']
#auth_url = "https://openapi.shl.se/oauth2/token"
#
#auth = HTTPBasicAuth(client_id, client_secret)
#client = BackendApplicationClient(client_id=client_id)
#oauth = OAuth2Session(client=client)
#oauth.fetch_token(token_url=auth_url, auth=auth)
#
## XXX loop over 2021 and 2023 aswell
#cursor.execute("DELETE FROM games WHERE leage = 'SHL'")
#for year in [2021 2022 2023]:
#    r = oauth.get(f'https://openapi.shl.se/seasons/{year}/games.json')
#    games = r.json()
#    for game in games:
#        #print(game)
#        #{'away_team_code': 'VLH', 'away_team_result': 4, 'game_center_active': True, 'game_center_url_desktop': 'http://shl.se/gamecenter/qbN-6gy4xdbRk/events/', 'game_center_url_mobile': 'http://shl.se/gamecenter/qbN-6gy4xdbRk/events/', 'game_id': 16005, 'game_type': 'Regular season game', 'game_uuid': 'qbN-6gy4xdbRk', 'highlights_coverage_enabled': False, 'home_team_code': 'IKO', 'home_team_result': 5, 'live_coverage_enabled': False, 'overtime': False, 'penalty_shots': True, 'played': True, 'season': '2022', 'series': 'SHL', 'start_date_time': '2022-09-17T15:15:00+0200', 'venue': 'Be-Ge Hockey Center'}
#        # Some games doesn't contain all fields
#        for key in ["ticket_url"]:
#            if key not in game:
#                #print(game)
#                game[key] = None
#
#        start_date_in_utc = arrow.get(game["start_date_time"]).to('utc').format('YYYY-MM-DD HH:mm')
#
#        cursor.execute("INSERT INTO games (home, away, start_time,venue,leage,ticket_url) VALUES (?,?,?,?,?,?)", [game["home_team_code"],game["away_team_code"],start_date_in_utc,game["venue"],"SHL",game["ticket_url"]])
#
#
#connection.commit()
#
#cursor.execute("DELETE FROM games WHERE leage = 'HA'")
#for url in ["https://calendar.ramses.nu/calendar/368/show/hockeyallsvenskan-2020-21.ics", "https://calendar.ramses.nu/calendar/778/show/hockeyallsvenskan-2022-23.ics"]:
#    cal = Calendar(requests.get(url).text)
#    #print(cal.events)
#    for event in cal.events:
#        teams = event.name.split(' - ')
#        home = teams.pop(0)
#        away = teams.pop(0)
#        # Some games (played?) contains the score
#        pattern = re.compile(r'\s\d+$')
#        if re.search(pattern, away):
#            away = re.sub(pattern,'', away)
#        home_key = teamdata.get_key(home)
#        away_key = teamdata.get_key(away)
#        start_time = event.begin.to('utc').format('YYYY-MM-DD HH:mm')
#
#        cursor.execute("INSERT INTO games (home, away, start_time,venue,leage,ticket_url) VALUES (?,?,?,?,?,?)", [home_key, away_key, start_time, event.location, "HA",event.url])
#
#
#connection.commit()

cursor.execute("DELETE FROM games WHERE leage = 'CHL'")
url = 'https://www.championshockeyleague.com/api/s3/live?q=live-events.json'
r = requests.get(url)
chl_games = r.json()
for game in chl_games["data"]:
    if game["_type"] != 'Corebine.Core.Sport.Match':
        continue

    start_time = arrow.get(game["startDate"]).to('utc').format('YYYY-MM-DD HH:mm')
    venue = game["venue"]["name"]
    home_key = game["teams"]["home"]["name"]
    away_key = game["teams"]["away"]["name"]
    ticket_url = 'https://www.championshockeyleague.com/en' + game["link"]["url"]

    swedish_team = None
    if teamdata.get_key(home_key):
        swedish_team = 1
        home_key = teamdata.get_key(home_key)

    if teamdata.get_key(away_key):
        swedish_team = 1
        away_key = teamdata.get_key(away_key)

    if swedish_team:
        cursor.execute("INSERT INTO games (home, away, start_time,venue,leage,ticket_url) VALUES (?,?,?,?,?,?)", [home_key, away_key, start_time, venue, "CHL",ticket_url])

connection.commit()
