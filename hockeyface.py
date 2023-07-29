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

        for leauge in ["shl", "ha"]:
            logger.debug(f"Processing {leauge}")

            for season in self.leauge_information[leauge]["seasonUuids"]:
                for gametype in self.leauge_information[leauge]["gameTypeUuids"]:
                    # Example URL
                    # https://www.hockeyallsvenskan.se/api/sports/game-info?seasonUuid=qcz-3NvSZ2Cmh&seriesUuid=qQ9-594cW8OWD&gameTypeUuid=qQ9-af37Ti40B&gamePlace=all&played=all

                    r = requests.get(
                        f"{self.leauge_information[leauge]['baseurl']}seasonUuid={season}&seriesUuid={self.leauge_information[leauge]['seriesUuid']}&gameTypeUuid={gametype}&gamePlace={self.leauge_information[leauge]['gamePlace']}&played={self.leauge_information[leauge]['played']}"
                    )

                    if r.headers["content-type"] == "application/json; charset=utf-8":
                        returned_json = r.json()
                        for event in returned_json["gameInfo"]:
                            startDateTime = event["startDateTime"]
                            home = event["homeTeamInfo"]["names"]["code"]
                            away = event["awayTeamInfo"]["names"]["code"]
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
                                    "league": leauge,
                                }
                            )
                    else:
                        logger.debug(f"{leauge} {season} {gametype} did not (yet?) respond with a json")

        for leauge in ["chl"]:
            logger.debug(f"Processing {leauge}")

            for season in self.leauge_information[leauge]["seasonUuids"]:
                # Example URL
                #  https://www.championshockeyleague.com/api/s3?q=schedule-21ec9dad81abe2e0240460d0-384dfd08cf1b5e6e93cd19ba.json

                r = requests.get(f"{self.leauge_information[leauge]['baseurl']}schedule-{season}.json")
                returned_json = r.json()
                for event in returned_json["data"]:
                    startDateTime = event["startDate"]
                    home = event["teams"]["home"]["name"]
                    away = event["teams"]["away"]["name"]
                    venue = event["venue"]["name"]
                    events.append(
                        {
                            "startDateTime": startDateTime,
                            "home": home,
                            "away": away,
                            "venue": venue,
                            "league": leauge,
                        }
                    )

        self.last_updated = int(time.time())
        return events

    def __filter_events(self, teams, leagues):
        events_to_return = []
        for event in self.events:
            if teams:
                if event["home"] in teams:
                    events_to_return.append(event)
                elif event["away"] in teams:
                    events_to_return.append(event)
                else:
                    match = False
                    for team in self.teamdata:
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

    def build_ical(self, events, teams):
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
            ical_event.add("summary", f"{home} - {away}")
            ical_event.add("uid", uuid.uuid4())
            ical_event.add("dtstamp", dstamp)
            ical_event.add("dtstart", event_start)
            ical_event.add("dtend", event_end)

            ical_event.add("location", event["venue"])
            cal.add_component(ical_event)

        return cal.to_ical().decode("utf-8")

    def __init__(self) -> None:
        logger.debug("Hockey McHockeyFace initiated")
        self.last_updated = 0
        self.leauge_information = {
            "shl": {
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
            "ha": {
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
            "chl": {
                "baseurl": "https://www.championshockeyleague.com/api/s3?q=",
                "seasonUuids": [
                    "21ec9dad81abe2e0240460d0-384dfd08cf1b5e6e93cd19ba",  # 2023/2024
                    "21ec9dad81abe2e0240460d0-42d2f45345814558d4daff38",  # 2022/2023
                ],
            },
        }
        self.events = self.__get_events()
        self.teamdata = self.__build_teamdata()
