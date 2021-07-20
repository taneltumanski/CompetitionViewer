import { RaceEventDto, RaceEventMessage } from "./racemessages";
import { BehaviorSubject } from "rxjs";
import { ClassInformation, ClassTimeIndex, EventInformation } from "../services/competitionService";
import { RaceUtils } from "../util/raceUtils";

export class RaceDataModel {
    public events = new Array<RaceEvent>();

    public clear() {
        this.events = [];
    }

    public remove(messageId: string) {
        let foundMessage = false;

        for (let eventIndex = 0; eventIndex < this.events.length; eventIndex++) {
            let event = this.events[eventIndex];

            for (let raceIndex = 0; raceIndex < event.races.length; raceIndex++) {
                let race = event.races[raceIndex];

                for (var resultIndex = 0; resultIndex < race.results.length; resultIndex++) {
                    let result = race.results[resultIndex];
                    if (result.messageId == messageId) {
                        foundMessage = true;
                        race.results.splice(resultIndex, 1);
                        break;
                    }
                }

                if (race.results.length == 0) {
                    event.races.splice(raceIndex, 1);
                }

                if (foundMessage) {
                    break;
                }
            }

            if (event.races.length == 0) {
                this.events.splice(eventIndex, 1);
            }

            if (foundMessage) {
                break;
            }
        }
    }

    public update(message: RaceEventMessage) {
        let year = new Date(message.timestamp).getFullYear();
        let existingEvent = this.getOrAddEvent(message.eventId, message.eventName);

        let raceClass = RaceUtils.getClass(message.racerId, existingEvent.eventInfo.generalClassName);
        if (raceClass == undefined || !RaceUtils.isValidRaceClass(raceClass)) {
            return;
        }

        let existingRace = existingEvent.races.find(x => x.raceId == message.raceId);
        if (existingRace == undefined) {
            existingRace = {
                eventId: message.eventId,
                eventName: message.eventName,
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
        let existingEventClass = existingEvent.classes.find(x => x.id == raceClass);
        if (existingEventClass == undefined) {
            existingEventClass = {
                id: raceClass,
                name: raceClass,
                classIndex: classInfo.index,
                results: new Array<RaceEventDto>(),
                qualificationDefiningProperty: classInfo.qualificationDefiningProperty,
                raceEndDefiningProperty: classInfo.raceEndDefiningProperty,
                eliminatorType: classInfo.eliminatorType,
                participants: new Array<ClassParticipant>(),
            };

            existingEvent.classes.push(existingEventClass);
        }

        existingEventClass.results.push(existingRace);

        let existingParticipant = existingEventClass.participants.find(x => x.participantId == existingResult.racerId);
        if (existingParticipant == undefined) {
            existingEventClass.participants.push({ participant: undefined, participantId: existingResult.racerId });
        }
    }

    private getOrAddEvent(id: string, name: string): RaceEvent {
        let eventInfo = this.getDefaultEventInfo(id, name);
        let existingEvent = this.events.find(x => x.id == id);
        if (existingEvent == undefined) {
            existingEvent = {
                id: eventInfo.id,
                name: eventInfo.name,
                eventInfo: eventInfo,
                classes: new Array<RaceClass>(),
                races: new Array<RaceEventDto>(),
                participants: new Array<Participant>(),
            };

            this.events.push(existingEvent);
        }

        return existingEvent;
    }

    private getDefaultEventInfo(id: string, name: string | undefined): EventInformation {
        return {
            id: id,
            name: name ?? "Unknown event: " + id,
            generalClassName: "Default class",
            classInformations: [],
            qualifyingStageKey: "Q",
            eliminatorStageKey: "E"
        };
    }

    private getDefaultClassInfo(raceClass: string, year: number): ClassInformation {
        let qualificationProp = ["BB", "J/BR", "ST",].includes(raceClass) ? RaceClassDefiningProperty.ReactionTime : ["SET", "PET", "SPET"].includes(raceClass) ? RaceClassDefiningProperty.DialInMargin : RaceClassDefiningProperty.QuarterMileTime;
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

    private isValidEvent(message: RaceEventDto) {
        return message.raceId
            && message.timestamp > 0
            && message.results.length > 0
            && message.results.every(x =>
                x.result != undefined && x.result >= 0
            )
            ;
    }
}

export interface RaceEvent {
    id: string;
    name: string;
    eventInfo: EventInformation;
    races: Array<RaceEventDto>;
    classes: Array<RaceClass>;
    participants: Array<Participant>;
}

export interface RaceClass {
    id: string;
    name: string;
    classIndex: ClassTimeIndex | undefined;
    qualificationDefiningProperty: RaceClassDefiningProperty;
    raceEndDefiningProperty: RaceEndDefiningProperty;
    eliminatorType: EliminatorType;
    results: Array<RaceEventDto>;
    participants: Array<ClassParticipant>;
}

export interface ClassParticipant {
    participantId: string;
    participant: Participant | undefined;
}

export interface Participant {
    name: string;
    identificationCodes: ObservableArray<string>;
    classes: ObservableArray<RaceClass>;
    results: ObservableArray<RaceEventDto>;
}

export enum RaceClassDefiningProperty {
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
    public push(item: T) {
        this.value.push(item);
        this.next(this.value);
    }

    public pushItems(items: T[]) {
        for (let item of items) {
            this.value.push(item);
        }

        this.next(this.value);
    }

    public clear() {
        this.value.splice(0, this.value.length);
        this.next(this.value);
    }
}
