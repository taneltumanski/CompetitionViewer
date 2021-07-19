import { Injectable, EventEmitter } from '@angular/core';
import { CompetitionMessage, RaceEventMessage, RaceEventResultMessage } from '../models/racemessages';
import { CompetitionMessageService } from './competitionMessageService';
import { RaceEvent, ObservableArray, RaceClass, RaceClassDefiningProperty, ClassParticipant, Participant, RaceEndDefiningProperty, EliminatorType } from '../models/models';
import { BehaviorSubject, interval } from 'rxjs';
import { sample, bufferTime } from 'rxjs/operators';
import { RaceUtils } from '../util/raceUtils';

@Injectable({
    providedIn: 'root',
})
export class CompetitionService {
    private rawMessages = new ObservableArray<RaceEventMessage>([]);
    private eventInformations: EventInformation[] = [];
    private selectedEventId: string | undefined;

    public filteredMessages = new BehaviorSubject<RaceEventMessage[]>([]);
    public events = new ObservableArray<RaceEvent>([]);
    public selectedEvent = new BehaviorSubject<RaceEvent | undefined>(undefined);
    public messageFilters = new ObservableArray<MessageFilter>([]);

    constructor(raceMessageService: CompetitionMessageService) {
        raceMessageService
            .getMessageStream()
            .subscribe(x => this.handleCompetitionMessage(x));
    }

    private reset(): void {
        console.log("Resetting data");

        this.selectedEvent.next(undefined);
        this.rawMessages.clear();
        this.events.clear();
        this.updateFilteredMessages();
    }

    public selectEvent(eventId: string | undefined) {
        this.selectedEventId = eventId;

        let selectedEvent = this.events.value.find(x => x.id == eventId);
        if (selectedEvent != undefined) {
            this.selectedEvent.next(selectedEvent);
        } else {
            this.selectedEvent.next(undefined);
        }

        this.updateFilteredMessages();
    }

    private handleCompetitionMessage(msg: CompetitionMessage) {
        if (msg.messageIndex == 0) {
            this.reset();
        }

        this.handleRaceMessages(msg.messages);
    }

    private handleRaceMessages(messages: RaceEventMessage[]) {
        for (const msg of messages) {
            this.handleRaceMessage(msg);
        }

        this.updateFilteredMessages();
    }

    private getOrAddEvent(id: string, name: string): RaceEvent {
        let eventInfo = this.eventInformations.find(x => x.id == id) || this.getDefaultEventInfo(id, name);
        let existingEvent = this.events.value.find(x => x.id == id);
        if (existingEvent == undefined) {
            existingEvent = {
                id: eventInfo.id,
                name: eventInfo.name,
                eventInfo: eventInfo,
                classes: new ObservableArray<RaceClass>([]),
                results: new ObservableArray<RaceEventMessage>([]),
                participants: new ObservableArray<Participant>([]),
            };

            this.events.push(existingEvent);
        }

        return existingEvent;
    }

    private updateFilteredMessages() {
        let messages = this.rawMessages.value.filter(x => this.isValidEvent(x));
        let selectedEventId = this.selectedEventId;

        if (selectedEventId != undefined) {
            messages = messages.filter(x => x.eventId == selectedEventId);
        }

        this.filteredMessages.next(messages);
    }

    private handleRaceMessage(message: RaceEventMessage) {
        let existingMessage = this.rawMessages.value.find(x => x.eventId == message.eventId && x.raceId == message.raceId && x.timestamp == message.timestamp)
        if (existingMessage != undefined) {
            return;
        }

        this.rawMessages.push(message);

        let year = new Date(message.timestamp).getFullYear();
        let existingEvent = this.getOrAddEvent(message.eventId, message.eventName);

        existingEvent.results.push(message);

        for (const result of message.results) {
            let racerId = result.racerId;
            let raceClass = RaceUtils.getClass(racerId, existingEvent.eventInfo.generalClassName);

            if (raceClass == undefined || !RaceUtils.isValidRaceClass(raceClass)) {
                continue;
            }

            let classInfo = existingEvent.eventInfo.classInformations.find(x => x.id == raceClass) || this.getDefaultClassInfo(raceClass, year);
            let existingEventClass = existingEvent.classes.value.find(x => x.id == raceClass);
            if (existingEventClass == undefined) {
                existingEventClass = {
                    id: raceClass,
                    name: raceClass,
                    classIndex: classInfo.index,
                    results: new ObservableArray<RaceEventMessage>([]),
                    qualificationDefiningProperty: classInfo.qualificationDefiningProperty,
                    raceEndDefiningProperty: classInfo.raceEndDefiningProperty,
                    eliminatorType: classInfo.eliminatorType,
                    participants: new ObservableArray<ClassParticipant>([]),
                };

                existingEvent.classes.push(existingEventClass);
            }

            existingEventClass.results.push(message);

            let existingParticipant = existingEventClass.participants.value.find(x => x.participantId == racerId);
            if (existingParticipant == undefined) {
                existingEventClass.participants.push({ participant: undefined, participantId: racerId });
            }
        }
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

    public getDefaultClassInfo(raceClass: string, year: number): ClassInformation {
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

    private isValidEvent(message: RaceEventMessage) {
        return message.raceId
            && message.timestamp > 0
            && message.results.length > 0
            && message.results.every(x =>
                x.result != undefined && x.result >= 0
            )
            ;
    }
}

export interface ClassTimeIndex {
    EightMileIndex: number;
    QuarterMileIndex: number;
}

export interface MessageFilter {
    racerId: string | undefined;
    raceId: string | undefined;
    classId: string | undefined;
    eventId: string | undefined;
}

export interface RaceEventModel {
    event: RaceEventModel
    eventId: string;
    eventName: string;
    raceId: string;
    round: string;
    timestamp: number;
    results: RaceEventResultModel[];
}

export interface RaceEventResultModel {
    racerId: string;
    lane: string | undefined;
    result: number | undefined;
    dialIn: number | undefined;
    reactionTime: number | undefined;
    sixtyFeetTime: number | undefined;
    threeThirtyFeetTime: number | undefined;
    sixSixtyFeetTime: number | undefined;
    sixSixtyFeetSpeed: number | undefined;
    thousandFeetTime: number | undefined;
    thousandFeetSpeed: number | undefined;
    finishTime: number | undefined;
    finishSpeed: number | undefined;
}

export interface EventInformation {
    id: string;
    name: string;
    generalClassName: string;
    classInformations: ClassInformation[];
    qualifyingStageKey: string;
    eliminatorStageKey: string;
}

export interface ClassInformation {
    id: string;
    name: string;
    index: ClassTimeIndex | undefined;
    qualificationDefiningProperty: RaceClassDefiningProperty;
    raceEndDefiningProperty: RaceEndDefiningProperty;
    eliminatorType: EliminatorType;
}

export interface RoundInformation {
    name: string;
    round: number | undefined;
}
