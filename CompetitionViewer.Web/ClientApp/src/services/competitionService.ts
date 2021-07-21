import { Injectable, EventEmitter } from '@angular/core';
import { CompetitionMessage, RaceEventMessage, RaceEventDto, RaceEventResultDto } from '../models/racemessages';
import { CompetitionMessageService } from './competitionMessageService';
import { RaceEvent, ObservableArray, RaceClass, RaceClassDefiningProperty, ClassParticipant, Participant, RaceEndDefiningProperty, EliminatorType, RaceDataModel } from '../models/models';
import { BehaviorSubject, interval } from 'rxjs';
import { sample, bufferTime } from 'rxjs/operators';
import { RaceUtils } from '../util/raceUtils';

@Injectable({
    providedIn: 'root',
})
export class CompetitionService {
    private selectedEventId: string | undefined;

    public dataModel = new RaceDataModel();
    public filteredMessages = new BehaviorSubject<RaceEventDto[]>([]);
    public selectedEvent = new BehaviorSubject<RaceEvent | undefined>(undefined);

    constructor(raceMessageService: CompetitionMessageService) {
        raceMessageService
            .getMessageStream()
            .subscribe(x => this.handleCompetitionMessage(x));
    }

    private reset(): void {
        this.selectedEvent.next(undefined);
        this.dataModel.clear();
        this.updateFilteredMessages();
    }

    public selectEvent(eventId: string | undefined) {
        this.selectedEventId = eventId;

        let selectedEvent = this.dataModel.events.value.find(x => x.id == eventId);
        if (selectedEvent != undefined) {
            this.selectedEvent.next(selectedEvent);
        } else {
            this.selectedEvent.next(undefined);
        }

        this.updateFilteredMessages();
    }

    private handleCompetitionMessage(msg: CompetitionMessage) {
        if (msg.messageIndex == 0) {
            let selectedEvent = this.selectedEventId;
            this.reset();
            this.selectEvent(selectedEvent);
        }

        this.handleRaceMessages(msg.messages);
    }

    private handleRaceMessages(messages: RaceEventMessage[]) {
        for (const msg of messages) {
            this.dataModel.update(msg);
        }

        this.updateFilteredMessages();
    }

    private updateFilteredMessages() {
        let messages: RaceEventDto[] | undefined;
        let selectedEventId = this.selectedEventId;

        if (selectedEventId != undefined) {
            messages = this.dataModel.events.value.find(x => x.id == selectedEventId)?.races.value;
        } else {
            messages = Array.prototype.concat(...this.dataModel.events.value.map(x => x.races.value));
        }

        if (messages != undefined) {
            this.filteredMessages.next(messages);
        }
    }
}

export interface ClassTimeIndex {
    EightMileIndex: number;
    QuarterMileIndex: number;
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
