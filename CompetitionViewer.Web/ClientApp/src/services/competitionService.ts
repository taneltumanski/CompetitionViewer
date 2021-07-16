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
    private selectedEventId: string | null = null;

    public filteredMessages = new BehaviorSubject<RaceEventMessage[]>([]);
    public events = new ObservableArray<RaceEvent>([]);
    public selectedEvent = new BehaviorSubject<RaceEvent | null>(null);
    public messageFilters = new ObservableArray<MessageFilter>([]);

    constructor(raceMessageService: CompetitionMessageService) {
        raceMessageService
            .getMessageStream()
            .subscribe(x => this.handleCompetitionMessage(x));
    }

    private reset(): void {
        console.log("Resetting data");

        this.selectedEvent.next(null);
        this.rawMessages.clear();
        this.events.clear();
        this.updateFilteredMessages();
    }

    public selectEvent(eventId: string | null) {
        this.selectedEventId = eventId;

        let selectedEvent = this.events.value.find(x => x.id == eventId);
        if (selectedEvent != undefined) {
            this.selectedEvent.next(selectedEvent);
        } else {
            this.selectedEvent.next(null);
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

    private updateFilteredMessages() {
        let messages = this.rawMessages.value.filter(x => this.isValidEvent(x));
        let selectedEventId = this.selectedEventId;

        if (selectedEventId != null) {
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
        let eventInfo = this.eventInformations.find(x => x.id == message.eventId) || this.getDefaultEventInfo(message);
        let existingEvent = this.events.value.find(x => x.id == message.eventId);
        if (existingEvent == undefined) {
            existingEvent = {
                id: message.eventId,
                name: eventInfo.name,
                eventInfo: eventInfo,
                classes: new ObservableArray<RaceClass>([]),
                results: new ObservableArray<RaceEventMessage>([]),
                participants: new ObservableArray<Participant>([]),
            };

            this.events.push(existingEvent);
        }

        existingEvent.results.push(message);

        for (const result of message.results) {
            let racerId = result.racerId;
            let raceClass = RaceUtils.getClass(racerId, eventInfo.generalClassName);

            if (raceClass == null || !RaceUtils.isValidRaceClass(raceClass)) {
                continue;
            }

            let classInfo = eventInfo.classInformations.find(x => x.id == raceClass) || this.getDefaultClassInfo(raceClass, year);
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
                existingEventClass.participants.push({ participant: null, participantId: racerId });
            }
        }
    }

    private getDefaultEventInfo(message: RaceEventMessage): EventInformation {
        return {
            id: message.eventId,
            name: "Unknown event: " + message.eventId,
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

    private getClassIndex(raceClass: string, year: number): ClassTimeIndex | null {
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

        return null;
    }

    private isValidEvent(message: RaceEventMessage) {
        return message.raceId
            && message.timestamp > 0
            && message.results.length > 0
            && message.results.every(x =>
                x.result != null && x.result >= 0
            )
            ;
    }
}

export interface ClassTimeIndex {
    EightMileIndex: number;
    QuarterMileIndex: number;
}

export interface MessageFilter {
    racerId: string | null;
    raceId: string | null;
    classId: string | null;
    eventId: string | null;
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
    lane: string | null;
    result: number | null;
    dialIn: number | null;
    reactionTime: number | null;
    sixtyFeetTime: number | null;
    threeThirtyFeetTime: number | null;
    sixSixtyFeetTime: number | null;
    sixSixtyFeetSpeed: number | null;
    thousandFeetTime: number | null;
    thousandFeetSpeed: number | null;
    finishTime: number | null;
    finishSpeed: number | null;
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
    index: ClassTimeIndex | null;
    qualificationDefiningProperty: RaceClassDefiningProperty;
    raceEndDefiningProperty: RaceEndDefiningProperty;
    eliminatorType: EliminatorType;
}

export interface RoundInformation {
    name: string;
    round: number | null;
}
