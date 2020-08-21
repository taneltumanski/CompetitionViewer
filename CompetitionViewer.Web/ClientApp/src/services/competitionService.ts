import { Injectable, EventEmitter } from '@angular/core';
import { RaceEventMessage, RaceEventResultMessage } from '../models/racemessages';
import { CompetitionMessageService } from './competitionMessageService';
import { RaceEvent, ObservableArray, RaceClass, RaceClassDefiningProperty, ClassParticipant, Participant, RaceEndDefiningProperty } from '../models/models';
import { BehaviorSubject } from 'rxjs';
import { RaceUtils } from '../util/raceUtils';

@Injectable({
    providedIn: 'root',
})
export class CompetitionService {
    private readonly rawMessages = new ObservableArray<RaceEventMessage>([]);
    private eventInformations: EventInformation[] = [];
    private selectedEventId: string | null = null;

    public filteredMessages = new BehaviorSubject<RaceEventMessage[]>([]);
    public events = new ObservableArray<RaceEvent>([]);
    public selectedEvent = new BehaviorSubject<RaceEvent | null>(null);
    public messageFilters = new ObservableArray<MessageFilter>([]);

    constructor(raceMessageService: CompetitionMessageService) {
        raceMessageService
            .getMessageStream()
            .subscribe(x => this.handleRaceMessages(x));
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
        this.rawMessages.push(message);

        let eventInfo = this.eventInformations.find(x => x.id == message.eventId) || this.getDefaultEventInfo(message);
        let existingEvent = this.events.value.find(x => x.id == message.eventId);
        if (existingEvent == undefined) {
            existingEvent = {
                id: message.eventId,
                name: eventInfo.name,
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

            let classInfo = eventInfo.classInformations.find(x => x.id == raceClass) || this.getDefaultClassInfo(raceClass);
            let existingEventClass = existingEvent.classes.value.find(x => x.id == raceClass);
            if (existingEventClass == undefined) {
                existingEventClass = {
                    id: raceClass,
                    name: raceClass,
                    results: new ObservableArray<RaceEventMessage>([]),
                    qualificationDefiningProperty: classInfo.qualificationDefiningProperty,
                    raceEndDefiningProperty: classInfo.raceEndDefiningProperty,
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
            classInformations: []
        };
    }

    public getDefaultClassInfo(raceClass: string): ClassInformation {
        let qualificationProp = ["BB", "SET", "PET", "J/BR",].includes(raceClass) ? RaceClassDefiningProperty.ReactionTime : RaceClassDefiningProperty.QuarterMileTime;
        let raceEndProp = ["J/BR"].includes(raceClass) ? RaceEndDefiningProperty.EightMileTime : RaceEndDefiningProperty.QuarterMileTime;

        return {
            id: raceClass,
            name: raceClass,
            qualificationDefiningProperty: qualificationProp,
            raceEndDefiningProperty: raceEndProp
        };
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
}

export interface ClassInformation {
    id: string;
    name: string;
    qualificationDefiningProperty: RaceClassDefiningProperty;
    raceEndDefiningProperty: RaceEndDefiningProperty;
}
