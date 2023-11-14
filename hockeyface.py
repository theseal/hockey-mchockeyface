#!/usr/bin/env python3

# from setup_logger import logger
import logging

logger = logging.getLogger(__name__)


class hockeyface(object):
    def get_events(self, teams, leagues):
        import time

        now = int(time.time())
        if (self.last_updated + 3600) <= now:
            logger.debug(f"Invalidating cache (last_updated: {self.last_updated})")
            self.__get_events()

        if not teams:
            return self.__filter_events([], leagues)
        else:
            return self.__filter_events(teams, leagues)

    def __get_events(self):
        import time

        import requests

        logger.info("Fetching events from upstream")
        events = []

        for league in ["SHL", "HA", "SDHL"]:
            logger.debug(f"Processing {league}")

            for season in self.league_information[league]["seasonUuids"]:
                for gametype in self.league_information[league]["gameTypeUuids"]:
                    # Example URL
                    # https://www.hockeyallsvenskan.se/api/sports/game-info?seasonUuid=qcz-3NvSZ2Cmh&seriesUuid=qQ9-594cW8OWD&gameTypeUuid=qQ9-af37Ti40B&gamePlace=all&played=all

                    r = requests.get(
                        f"{self.league_information[league]['baseurl']}seasonUuid={season}&seriesUuid={self.league_information[league]['seriesUuid']}&gameTypeUuid={gametype}&gamePlace={self.league_information[league]['gamePlace']}&played={self.league_information[league]['played']}"
                    )

                    if r.headers["content-type"] == "application/json; charset=utf-8":
                        returned_json = r.json()
                        for event in returned_json["gameInfo"]:
                            startDateTime = event["startDateTime"]
                            if "names" in event["homeTeamInfo"]:
                                home = event["homeTeamInfo"]["names"]["code"]
                            else:
                                home = "TBD"
                            if "names" in event["awayTeamInfo"]:
                                away = event["awayTeamInfo"]["names"]["code"]
                            else:
                                away = "TBD"
                            if event["venueInfo"]:
                                venue = event["venueInfo"]["name"]
                            else:
                                venue = ""
                            events.append(
                                {
                                    "startDateTime": startDateTime,
                                    "home": home,
                                    "away": away,
                                    "venue": venue,
                                    "league": league,
                                }
                            )
                    else:
                        logger.debug(f"{league} {season} {gametype} did not (yet?) respond with a json")

        for league in ["CHL"]:
            logger.debug(f"Processing {league}")

            for season in self.league_information[league]["seasonUuids"]:
                # Example URL
                #  https://www.championshockeyleague.com/api/s3?q=schedule-21ec9dad81abe2e0240460d0-384dfd08cf1b5e6e93cd19ba.json

                r = requests.get(f"{self.league_information[league]['baseurl']}schedule-{season}.json")
                returned_json = r.json()
                for event in returned_json["data"]:
                    startDateTime = event["startDate"]
                    home = event["teams"]["home"]["name"]
                    away = event["teams"]["away"]["name"]
                    venue = ""
                    if "ventue" in event:
                        venue = event["venue"]["name"]
                    events.append(
                        {
                            "startDateTime": startDateTime,
                            "home": home,
                            "away": away,
                            "venue": venue,
                            "league": league,
                        }
                    )

        self.last_updated = int(time.time())
        return events

    def __filter_events(self, teams, leagues):
        events_to_return = []
        for event in self.events:
            if teams:
                if event["league"] not in leagues:
                    continue

                if event["home"] in teams:
                    events_to_return.append(event)
                elif event["away"] in teams:
                    events_to_return.append(event)
                else:
                    match = False
                    for team in self.teamdata:
                        if team["key"] not in teams:
                            continue
                        name = team["name"]
                        if name == event["home"] or name == event["away"]:
                            logger.warning(f"Match in name for {name}: {event}")
                            events_to_return.append(event)
                            match = True
                            break

                        for name in team["alternateNames"]:
                            if name == event["home"] or name == event["away"]:
                                if team["key"] in teams:
                                    logger.warning(f"Match in alternativeNames for {name}: {event}")
                                    events_to_return.append(event)
                                    match = True
                                    break
                        if match == True:
                            break

                    # if match == False:
                    #    logger.debug(event)
            else:
                if event["league"] in leagues:
                    events_to_return.append(event)

        return events_to_return

    def __build_teamdata(self):
        import json

        team_data_file = "static/teamdata.json"
        with open(team_data_file) as json_file:
            file_contents = json_file.read()
            team_data = json.loads(file_contents)
        return team_data

    def __pp_team_name(self, short):
        for team in self.teamdata:
            if team["key"] == short:
                return team["name"]
            if team["name"] == short:
                return team["name"]
            for name in team["alternateNames"]:
                if name == short:
                    return team["name"]

        logger.warn(f"No match for '{short}'")
        return short

    def __pp_cal_name(self, teams):
        return_dict = {
            "CALNAME": "Svensk hockey",
            "CALDESC": "Spelschema för svensk hockey",
        }
        if len(teams) == 1:
            for team in self.teamdata:
                if team["key"] == teams[0]:
                    return_dict = {
                        "CALNAME": f"{team['name']}",
                        "CALDESC": f"Spelschema för {team['name']}",
                    }

        return return_dict

    def build_ical(self, events, teams, leagues):
        import uuid
        from datetime import datetime, timedelta

        import pytz
        from icalendar import Calendar, Event

        cal = Calendar()
        cal.add("prodid", "-//Hockey McHF//Hockey McHockeyFace//EN")
        cal.add("version", "2.0")
        cal.add("CALSCALE", "GREGORIAN")
        dstamp = datetime.now()

        desc = self.__pp_cal_name(teams)
        cal.add("X-WR-CALNAME", desc["CALNAME"])
        cal.add("X-WR-CALDESC", desc["CALDESC"])

        for event in events:
            home = self.__pp_team_name(event["home"])
            away = self.__pp_team_name(event["away"])
            event_start = datetime.fromisoformat(event["startDateTime"]).astimezone(pytz.utc)
            event_end = event_start + timedelta(minutes=150)

            ical_event = Event()
            prefix_string = ""
            if ("SHL" in leagues and "SDHL" in leagues) or event["league"] == "CHL":
                prefix_string = f"{event['league']}: "

            ical_event.add("summary", f"{prefix_string}{home} - {away}")
            ical_event.add("uid", uuid.uuid4())
            ical_event.add("dtstamp", dstamp)
            ical_event.add("dtstart", event_start)
            ical_event.add("dtend", event_end)

            ical_event.add("location", event["venue"])
            cal.add_component(ical_event)

        return cal.to_ical().decode("utf-8")

    def build_rss(self, team, labels_to_skip):

        from feedgen.feed import FeedGenerator
        import requests
        import re

        index = 0
        match = False
        for _team in self.teamdata:
            print(_team)
            if team == _team["key"]:
                match = True
                break
            else:
                index += 1

        if not match:
            return

        if "rss_url" in self.teamdata[index]:
            url = self.teamdata[index]["rss_url"]
        else:
            return

        fg = FeedGenerator()
        fg.id(f"Hockeyface {team}")
        fg.link(href=self.teamdata[index]["article_baseurl"])
        fg.title(self.teamdata[index]["name"])
        fg.description(self.teamdata[index]["desc"])

        r = requests.get(url)
        returned_json = r.json()
        for article in reversed(returned_json["data"]["articleItems"]):
            if "label" in article["metadata"]:
                if article["metadata"]["label"] in labels_to_skip:
                    continue

            fe = fg.add_entry()
            fe.id(article["id"])
            fe.title(article["header"])
            description = re.sub(r"\n", "<br>", article["intro"]).strip('"')
            description = article["intro"].strip('"')
            fe.summary(description, type="html")
            fe.published(article["publishedAt"])
            fe.link(href=f"{self.teamdata[index]['article_baseurl']}/article/{article['id']}/view")

        return fg.rss_str(pretty=True)

    def __init__(self) -> None:
        logger.debug("Hockey McHockeyFace initiated")
        self.last_updated = 0
        self.league_information = {
            "SHL": {
                "baseurl": "https://www.shl.se/api/sports/game-info?",
                "seriesUuid": "qQ9-bb0bzEWUk",
                "gameTypeUuids": [
                    "qQ9-af37Ti40B",  # Seriematch
                    "qRf-347BaDIOc",  # Kvalmatch nedflyttning
                    "qQ9-7debq38kX",  # Slutspelsmatch
                    "qQ9-46aa140wUl",  # Play in-match
                ],
                "gamePlace": "all",
                "played": "all",
                "seasonUuids": [
                    "qcz-3NvSZ2Cmh",  # 2023/2024
                    "qbN-XMFfjGVt",  # 2022/2023
                    "qZl-8qa6OaFXf",  # 2021/2022
                ],
            },
            "HA": {
                "baseurl": "https://www.hockeyallsvenskan.se/api/sports/game-info?",
                "seriesUuid": "qQ9-594cW8OWD",
                "gameTypeUuids": [
                    "qQ9-af37Ti40B",  # Seriematch
                    "qRe-AJnJ12qqEc",  # Seriefinalmatch
                    "qRe-AJkH2owyv",  # Slutspelsseriematch
                    "qQ9-7debq38kX",  # Slutspelsmatch
                    "qRe-AJog2gISz",  # Kvalmatch uppflyttning
                    "qRf-347BaDIOc",  # Kvalmatch nedflyttning
                    "qQ9-be68b0QHe",  # Vänskapsmatch
                ],
                "gamePlace": "all",
                "played": "all",
                "seasonUuids": [
                    "qcz-3NvSZ2Cmh",  # 2023/2024
                    "qbN-XMFfjGVt",  # 2022/2023
                    "qZl-8qa6OaFXf",  # 2021/2022
                ],
            },
            "CHL": {
                "baseurl": "https://www.championshockeyleague.com/api/s3?q=",
                "seasonUuids": [
                    "21ec9dad81abe2e0240460d0-384dfd08cf1b5e6e93cd19ba",  # 2023/2024
                    "21ec9dad81abe2e0240460d0-42d2f45345814558d4daff38",  # 2022/2023
                    "21ec9dad81abe2e0240460d0-f73bbb143cc88c3ebe188d77",  # 2021/2022
                ],
            },
            "SDHL": {
                "baseurl": "https://www.sdhl.se/api/sports/game-info?",
                "seriesUuid": "qQ9-f438G8BXP",
                "gameTypeUuids": [
                    "qQ9-af37Ti40B",  # Seriematch
                    "qRe-AJog2gISz",  # Kvalmatch uppflyttning
                    "qRf-347BaDIOc",  # Kvalmatch nedflyttning
                    "qQ9-7debq38kX",  # Slutspelsmatch
                ],
                "gamePlace": "all",
                "played": "all",
                "seasonUuids": [
                    "qcz-3NvSZ2Cmh",  # 2023/2024
                    "qbN-XMFfjGVt",  # 2022/2023
                    "qZl-8qa6OaFXf",  # 2021/2022
                ],
            },
        }
        self.events = self.__get_events()
        self.teamdata = self.__build_teamdata()
