import { RaceEventRace, RaceEventDataMessage, RaceEventMessage } from "./racemessages";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { ClassInformation, ClassTimeIndex, EventInformation } from "../services/competitionService";
import { RaceUtils } from "../util/raceUtils";

export class RaceDataModel {
    public events = new ObservableArray<RaceEvent>([]);

    public clear() {
        this.events.clear()
    }

    public remove(messageId: string) {
        let foundMessage = false;

        for (let eventIndex = 0; eventIndex < this.events.value.length; eventIndex++) {
            let event = this.events.value[eventIndex];

            for (let raceIndex = 0; raceIndex < event.races.value.length; raceIndex++) {
                let race = event.races.value[raceIndex];

                for (var resultIndex = 0; resultIndex < race.results.length; resultIndex++) {
                    let result = race.results[resultIndex];
                    if (result.messageId == messageId) {
                        foundMessage = true;
                        race.results.splice(resultIndex, 1);
                        break;
                    }
                }

                if (race.results.length == 0) {
                    event.races.remove(raceIndex);
                }

                if (foundMessage) {
                    break;
                }
            }

            if (event.races.value.length == 0) {
                this.events.remove(eventIndex);
            }

            if (foundMessage) {
                break;
            }
        }
    }

    public updateEvents(events: RaceEventMessage[]) {
        let newEventIds = events.map(x => x.id);

        for (let evt of events) {
            this.getOrAddEvent(evt.id, evt.name);
        }

        let removeEventIds = this.events
            .value
            .map(x => x.id)
            .filter(x => !newEventIds.some(y => x == y));

        let eventIndexes = removeEventIds
            .map(x => this.events.value.findIndex(y => y.id == x))
            .filter(x => x >= 0)

        this.events.remove(eventIndexes);
    }

    public update(message: RaceEventDataMessage) {
        let year = new Date(message.timestamp).getFullYear();
        let existingEvent = this.getOrAddEvent(message.eventId, message.eventId);

        let raceClass = RaceUtils.getClass(message.racerId, existingEvent.eventInfo.generalClassName);
        if (raceClass == undefined || !RaceUtils.isValidRaceClass(raceClass)) {
            return;
        }

        let existingRace = existingEvent.races.value.find(x => x.raceId == message.raceId);
        if (existingRace == undefined) {
            existingRace = {
                event: existingEvent,
                raceId: message.raceId,
                round: message.round,
                timestamp: message.timestamp,
                results: []
            };

            existingEvent.races.push(existingRace);
        }

        let existingResult = existingRace.results.find(x => x.racerId == message.racerId);
        if (existingResult == undefined) {
            existingResult = {
                race: existingRace,
                messageId: message.hashcode,
                racerId: message.racerId,
                lane: message.lane,
                result: message.result,
                dialIn: message.dialIn,
                reactionTime: message.reactionTime,
                sixtyFeetTime: message.sixtyFeetTime,
                threeThirtyFeetTime: message.threeThirtyFeetTime,
                sixSixtyFeetTime: message.sixSixtyFeetTime,
                sixSixtyFeetSpeed: message.sixSixtyFeetSpeed,
                thousandFeetTime: message.thousandFeetTime,
                thousandFeetSpeed: message.thousandFeetSpeed,
                finishTime: message.finishTime,
                finishSpeed: message.finishSpeed
            };

            existingRace.results.push(existingResult);
        }

        let classInfo = existingEvent.eventInfo.classInformations.find(x => x.id == raceClass) || this.getDefaultClassInfo(raceClass, year);
        let existingEventClass = existingEvent.classes.value.find(x => x.id == raceClass);
        if (existingEventClass == undefined) {
            existingEventClass = {
                event: existingEvent,
                id: raceClass,
                name: raceClass,
                classIndex: classInfo.index,
                qualificationDefiningProperty: classInfo.qualificationDefiningProperty,
                raceEndDefiningProperty: classInfo.raceEndDefiningProperty,
                eliminatorType: classInfo.eliminatorType,
                results: new ObservableArray<RaceEventRace>([]),
                participants: new ObservableArray<ClassParticipant>([]),
            };

            existingEvent.classes.push(existingEventClass);
        }

        existingEventClass.results.push(existingRace);

        let existingParticipant = existingEventClass.participants.value.find(x => x.participantId == existingResult!.racerId);
        if (existingParticipant == undefined) {
            existingEventClass.participants.push({ participant: undefined, participantId: existingResult.racerId });
        }
    }

    private getOrAddEvent(id: string, name: string | undefined): RaceEvent {
        let eventInfo = this.getDefaultEventInfo(id, name);
        let existingEvent = this.events.value.find(x => x.id == id);
        if (existingEvent == undefined) {
            existingEvent = {
                id: id,
                name: name ?? "Unknown event: " + id,
                eventInfo: eventInfo,
                classes: new ObservableArray<RaceClass>([]),
                races: new ObservableArray<RaceEventRace>([]),
                participants: new ObservableArray<Participant>([])
            };

            this.events.push(existingEvent);
        } else if (name !== undefined) {
            existingEvent.name = name;
        }

        return existingEvent;
    }

    private getDefaultEventInfo(id: string, name: string | undefined): EventInformation {
        return {
            generalClassName: "DEFAULT",
            classInformations: [],
            qualifyingStageKey: "Q",
            eliminatorStageKey: "E"
        };
    }

    private getDefaultClassInfo(raceClass: string, year: number): ClassInformation {
        let qualificationProp = ["BB", "J/BR"].includes(raceClass) ? RaceQualificationDefiningProperty.ReactionTime : ["SET", "PET", "SPET"].includes(raceClass) ? RaceQualificationDefiningProperty.DialInMargin : RaceQualificationDefiningProperty.QuarterMileTime;
        let raceEndProp = ["J/BR"].includes(raceClass) ? RaceEndDefiningProperty.EightMileTime : RaceEndDefiningProperty.QuarterMileTime;
        let eliminatorType = ["OL", "PB"].includes(raceClass) ? EliminatorType.Pro : EliminatorType.Sportsman;
        let classIndex = this.getClassIndex(raceClass, year);

        return {
            id: raceClass,
            name: raceClass,
            index: classIndex,
            qualificationDefiningProperty: qualificationProp,
            raceEndDefiningProperty: raceEndProp,
            eliminatorType: eliminatorType
        };
    }

    private getClassIndex(raceClass: string, year: number): ClassTimeIndex | undefined {
        if (year == 2021) {
            if (raceClass.toLocaleUpperCase() == "ST") {
                return {
                    EightMileIndex: 8.88,
                    QuarterMileIndex: 13.9
                }
            }

            if (raceClass.toLocaleUpperCase() == "ST/A") {
                return {
                    EightMileIndex: 8.23,
                    QuarterMileIndex: 12.9
                }
            }

            if (raceClass.toLocaleUpperCase() == "ST/B") {
                return {
                    EightMileIndex: 7.6,
                    QuarterMileIndex: 11.9
                }
            }

            if (raceClass.toLocaleUpperCase() == "SST") {
                return {
                    EightMileIndex: 7.04,
                    QuarterMileIndex: 10.9
                }
            }

            if (raceClass.toLocaleUpperCase() == "OL") {
                return {
                    EightMileIndex: 4.5,
                    QuarterMileIndex: 7.5
                }
            }
        }

        if (raceClass.toLocaleUpperCase() == "ST") {
            return {
                EightMileIndex: 8.88,
                QuarterMileIndex: 13.9
            }
        }

        if (raceClass.toLocaleUpperCase() == "ST/A") {
            return {
                EightMileIndex: 8.23,
                QuarterMileIndex: 12.9
            }
        }

        if (raceClass.toLocaleUpperCase() == "ST/B") {
            return {
                EightMileIndex: 7.6,
                QuarterMileIndex: 11.9
            }
        }

        if (raceClass.toLocaleUpperCase() == "SST") {
            return {
                EightMileIndex: 7.04,
                QuarterMileIndex: 10.9
            }
        }

        if (raceClass.toLocaleUpperCase() == "OL") {
            return {
                EightMileIndex: 4.5,
                QuarterMileIndex: 7.5
            }
        }

        return undefined;
    }
}

export interface RaceEvent {
    id: string;
    name: string;
    eventInfo: EventInformation;
    races: ObservableArray<RaceEventRace>;
    classes: ObservableArray<RaceClass>;
    participants: ObservableArray<Participant>;
}

export interface RaceClass {
    id: string;
    name: string;
    event: RaceEvent;
    classIndex: ClassTimeIndex | undefined;
    qualificationDefiningProperty: RaceQualificationDefiningProperty;
    raceEndDefiningProperty: RaceEndDefiningProperty;
    eliminatorType: EliminatorType;
    results: ObservableArray<RaceEventRace>;
    participants: ObservableArray<ClassParticipant>;
}

export interface ClassParticipant {
    participantId: string;
    participant: Participant | undefined;
}

export interface Participant {
    name: string;
    identificationCodes: ObservableArray<string>;
    classes: ObservableArray<RaceClass>;
    results: ObservableArray<RaceEventRace>;
}

export enum RaceQualificationDefiningProperty {
    Invalid = 0,
    QuarterMileTime = 1,
    EightMileTime = 2,
    ReactionTime = 3,
    DialInMargin = 4
}

export enum RaceEndDefiningProperty {
    Invalid = 0,
    QuarterMileTime = 1,
    EightMileTime = 2
}

export enum EliminatorType {
    Invalid = 0,
    Sportsman = 1,
    Pro = 2
}

export class ObservableArray<T> extends BehaviorSubject<T[]> {
    public push(item: T | T[]) {
        if ((<T[]>item).push == undefined) {
            this.value.push(<T>item);
        } else {
            for (let i of <T[]>item) {
                this.value.push(i);
            } 
        }

        this.next(this.value);        
    }

    public remove(index: number | number[]) {
        if ((<number[]>index).push == undefined) {
            this.value.splice(<number>index, 1);
        } else {
            let sorted = (<number[]>index).sort((a, b) => b - a);

            for (let i of sorted) {
                this.value.splice(i, 1);
            }
        }
        
        this.next(this.value);
    }

    public clear() {
        this.value.splice(0, this.value.length);
        this.next(this.value);
    }
}
