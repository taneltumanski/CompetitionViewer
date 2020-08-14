import { Injectable, EventEmitter } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HttpError } from '@aspnet/signalr';
import { Observable, Subject, ReplaySubject } from 'rxjs';
import { RaceEventMessage } from '../models/racemessages';
import { CompetitionMessageService } from './competitionMessageService';
import { RaceEvent } from '../models/models';

@Injectable({
    providedIn: 'root',
})
export class CompetitionService {
    public allMessages: RaceEventMessage[] = [];
    public eventList: RaceEvent[] = [];
    public selectedEvent: RaceEvent | null = null;

    public test: EventEmitter<string>;

    constructor(raceMessageService: CompetitionMessageService) {
        raceMessageService
            .getMessageStream()
            .subscribe(x => this.handleRaceMessages(x));
    }

    private handleRaceMessages(messages: RaceEventMessage[]) {
        for (const msg of messages) {
            this.handleRaceMessage(msg);
        }
    }

    private handleRaceMessage(message: RaceEventMessage) {
        //this.allMessages.push(message);

        //let existingEvent = this.eventList.find(x => x.eventId == event.eventId);
        //if (existingEvent == undefined) {
        //    existingEvent = {
        //        eventId: event.eventId,
        //        eventName: event.eventName || event.eventId,
        //        classes: [],
        //        results: []
        //    };

        //    this.eventList.push(existingEvent);
        //}

        //existingEvent.results.push(event);

        //for (const result of event.results) {
        //    let racerId = result.racerId;
        //    let raceClass = RaceUtils.getClass(racerId);

        //    if (raceClass == null) {
        //        raceClass = "GENERAL";
        //    }

        //    if (!RaceUtils.isValidRaceClass(raceClass)) {
        //        continue;
        //    }

        //    let existingEventClass = existingEvent.classes.find(x => x.classId == raceClass);
        //    if (existingEventClass == undefined) {
        //        existingEventClass = {
        //            classId: raceClass,
        //            className: raceClass,
        //            participants: [],
        //            results: []
        //        };

        //        existingEvent.classes.push(existingEventClass);
        //    }

        //    existingEventClass.results.push(event);

        //    let existingParticipant = existingEventClass.participants.find(x => x == racerId);
        //    if (existingParticipant == undefined) {
        //        existingEventClass.participants.push(racerId);
        //    }
        //}
    }
}
