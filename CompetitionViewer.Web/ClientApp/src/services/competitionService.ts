import { Injectable, EventEmitter } from '@angular/core';
import { RaceEventMessage } from '../models/racemessages';
import { CompetitionMessageService } from './competitionMessageService';
import { RaceEvent, ObservableArray, RaceClass, RaceClassDefiningProperty, ClassParticipant, Participant } from '../models/models';
import { BehaviorSubject } from 'rxjs';
import { RaceUtils } from '../util/raceUtils';

@Injectable({
    providedIn: 'root',
})
export class CompetitionService {
    private readonly rawMessages = new ObservableArray<RaceEventMessage>([]);
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
        let selectedEventId = this.selectedEvent.value ? this.selectedEvent.value.id : null;

        if (selectedEventId != null) {
            messages = messages.filter(x => x.eventId == selectedEventId);
        }

        this.filteredMessages.next(messages);
    }

    private handleRaceMessage(message: RaceEventMessage) {
        this.rawMessages.push(message);

        let existingEvent = this.events.value.find(x => x.id == message.eventId);
        if (existingEvent == undefined) {
            existingEvent = {
                id: message.eventId,
                name: message.eventName || message.eventId,
                classes: new ObservableArray<RaceClass>([]),
                results: new ObservableArray<RaceEventMessage>([]),
                participants: new ObservableArray<Participant>([]),
            };

            this.events.push(existingEvent);
        }

        existingEvent.results.push(message);

        for (const result of message.results) {
            let racerId = result.racerId;
            let raceClass = RaceUtils.getClass(racerId, "GENERAL");

            if (!RaceUtils.isValidRaceClass(raceClass)) {
                continue;
            }

            let existingEventClass = existingEvent.classes.value.find(x => x.id == raceClass);
            if (existingEventClass == undefined) {
                let prop = ["BB", "SET", "PET", "J/BR",].includes(raceClass) ? RaceClassDefiningProperty.ReactionTime : RaceClassDefiningProperty.FinishTime;

                existingEventClass = {
                    id: raceClass,
                    name: raceClass,
                    results: new ObservableArray<RaceEventMessage>([]),
                    definingProperty: prop,
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
    isGlobal: boolean;
}
