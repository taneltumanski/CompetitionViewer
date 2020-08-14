import { Component} from '@angular/core';
import { RaceEventMessage } from '../../models/racemessages';
import { CompetitionMessageService } from '../../services/competitionMessageService';
import { RaceEvent, RaceClassDefiningProperty, ObservableArray, RaceClass, Participant, ClassParticipant } from '../../models/models';
import { RaceUtils } from '../../util/raceUtils';

@Component({
    selector: 'competition',
    templateUrl: './competition.component.html',
    styleUrls: ['./competition.component.css'],
})
export class CompetitionComponent {
    private raceMessages: RaceEventMessage[] = [];

    public filteredMessages: RaceEventMessage[] = [];
    public eventList: RaceEvent[] = [];
    public selectedEvent: RaceEvent | null = null;

    private hasEventBeenSelected: boolean = false;

    constructor(messageService: CompetitionMessageService) {
        this.clearState();

        messageService
            .getMessageStream()
            .subscribe(x => this.handleMessages(x));
    }

    onSelectedEventChange() {
        this.hasEventBeenSelected = true;
        this.updateUI();
    }

    private clearState() {
        this.raceMessages = [];
        this.selectedEvent = null;

        this.updateUI();
    }

    private handleMessages(events: RaceEventMessage[]) {
        for (const event of events) {
            this.handleMessage(event);
        }

        this.updateUI();
    }

    private handleMessage(event: RaceEventMessage) {
        event.results.sort((a, b) => a.lane.localeCompare(b.lane));

        this.raceMessages.push(event);

        let existingEvent = this.eventList.find(x => x.id == event.eventId);
        if (existingEvent == undefined) {
            existingEvent = {
                id: event.eventId,
                name: event.eventName || event.eventId,
                classes: new ObservableArray<RaceClass>([]),
                results: new ObservableArray<RaceEventMessage>([]),
                participants: new ObservableArray<Participant>([]),
            };

            this.eventList.push(existingEvent);
        }

        existingEvent.results.push(event);

        for (const result of event.results) {
            let racerId = result.racerId;
            let raceClass = RaceUtils.getClass(racerId);

            if (raceClass == null) {
                raceClass = "GENERAL";
            }

            if (!RaceUtils.isValidRaceClass(raceClass)) {
                continue;
            }

            let existingEventClass = existingEvent.classes.value.find(x => x.id == raceClass);
            if (existingEventClass == undefined) {
                let prop = ["BB", "SET", "PET", "J/BR",].includes(raceClass) ? RaceClassDefiningProperty.ReactionTime : RaceClassDefiningProperty.FinishTime;

                existingEventClass = {
                    id: raceClass,
                    definingProperty: prop,
                    name: raceClass,
                    participants: new ObservableArray<ClassParticipant>([]),
                    results: new ObservableArray<RaceEventMessage>([]),
                };

                existingEvent.classes.push(existingEventClass);
            }

            existingEventClass.results.push(event);

            let existingParticipant = existingEventClass.participants.value.find(x => x.participantId == racerId);
            if (existingParticipant == undefined) {
                existingEventClass.participants.push({
                    participantId: racerId,
                    participant: null
                });
            }
        }
    }

    private updateUI() {
        this.filteredMessages = this.filterMessages(this.raceMessages).sort((a, b) => b.timestamp - a.timestamp);

        if (!this.hasEventBeenSelected && this.eventList.length > 0) {
            this.selectedEvent = this.eventList[this.eventList.length - 1];
        }
    }

    private filterMessages(messages: RaceEventMessage[]): RaceEventMessage[] {
        let filteredMessages = messages;

        if (this.selectedEvent != null) {
            filteredMessages = filteredMessages.filter(x => x.eventId == this.selectedEvent.id);
        }

        for (var i = 0; i < filteredMessages.length; i++) {
            for (var j = 0; j < filteredMessages[i].results.length; j++) {
                let result = filteredMessages[i].results[j];
                let raceClass = RaceUtils.getClass(result.racerId);

                if (raceClass != null && raceClass.toUpperCase().startsWith("RWYB") && raceClass.length > 4) {
                    filteredMessages[i].results.splice(j, 1);
                    j--;
                }
            }

            if (filteredMessages[i].results.length == 0) {
                filteredMessages.splice(i, 1);
                i--;
            }
        }

        return filteredMessages;
    }
}
