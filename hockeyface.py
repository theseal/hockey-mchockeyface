#!/usr/bin/env python3

# from setup_logger import logger
import logging

logger = logging.getLogger(__name__)


class hockeyface(object):
    def get_events(self, teams):
        import time

        now = int(time.time())
        if (self.last_updated + 3600) <= now:
            logger.debug(f"Invalidating cache (last_updated: {self.last_updated})")
            self.__get_events()

        if not teams:
            return self.events
        else:
            return self.__filter_events(teams)

    def __get_events(self):
        import time

        import requests

        logger.info("Fetching events from upstream")
        events = []

        leage_information = {
            "shl": {
                "url": "https://www.shl.se/api/sports/game-info?seasonUuid=qcz-3NvSZ2Cmh&seriesUuid=qQ9-bb0bzEWUk&gameTypeUuid=qQ9-af37Ti40B&gamePlace=all&played=all"
            },
            "ha": {
                "url": "https://www.hockeyallsvenskan.se/api/sports/game-info?seasonUuid=qcz-3NvSZ2Cmh&seriesUuid=qQ9-594cW8OWD&gameTypeUuid=qQ9-af37Ti40B&gamePlace=all&played=all"
            },
        }

        for leage in ["shl", "ha"]:
            logger.debug(f"Processing {leage}")

            r = requests.get(leage_information[leage]["url"])
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
                    }
                )

        self.last_updated = int(time.time())
        return events

    def __filter_events(self, teams):
        events_to_return = []
        for event in self.events:
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
        from datetime import datetime, timedelta

        from icalendar import Calendar, Event

        cal = Calendar()
        cal.add("prodid", "-//Hockey McHF//Hockey McHockeyFace//EN")
        cal.add("version", "2.0")
        cal.add("version", "2.0")
        cal.add("CALSCALE", "GREGORIAN")
        dstamp = datetime.now()

        desc = self.__pp_cal_name(teams)
        cal.add("X-WR-CALNAME", desc["CALNAME"])
        cal.add("X-WR-CALDESC", desc["CALDESC"])

        for event in events:
            home = self.__pp_team_name(event["home"])
            away = self.__pp_team_name(event["away"])
            ical_event = Event()
            ical_event.add("summary", f"{home} - {away}")
            ical_event.add("dtstamp", dstamp)
            ical_event.add("dtstart", datetime.fromisoformat(event["startDateTime"]))
            ical_event.add(
                "dtend",
                datetime.fromisoformat(event["startDateTime"]) + timedelta(minutes=150),
            )

            ical_event.add("location", event["venue"])
            cal.add_component(ical_event)

        return cal.to_ical().decode("utf-8")

    def __init__(self) -> None:
        logger.debug("Hockey McHockeyFace initiated")
        self.last_updated = 0
        self.events = self.__get_events()
        self.teamdata = self.__build_teamdata()
