import { Component, Input } from '@angular/core';
import { RaceEvent } from '../../models/models';
import { CompetitionService } from '../../services/competitionService';

@Component({
    selector: 'competition-eventInfo',
    templateUrl: './competition.eventInfo.component.html',
})
export class CompetitionEventInfoComponent {
    public selectedEvent: RaceEvent | null = null;

    constructor(competitionService: CompetitionService) {
        competitionService
            .selectedEvent
            .subscribe(x => this.selectedEvent = x);
    }

    public getParticipantCount(event: RaceEvent | null): number {
        if (event == null) {
            return 0;
        }

        return event.classes.value.reduce((acc, val) => acc + val.participants.value.length, 0);
    }

    public getRaceCount(event: RaceEvent | null): number {
        if (event == null) {
            return 0;
        }

        return event.results.value.length;
    }

    public getFirstDate(event: RaceEvent | null): number | undefined {
        if (event == null) {
            return 0;
        }

        return event.results.value.map(x => x.timestamp).sort((a, b) => b - a).pop();
    }

    public getLastDate(event: RaceEvent | null): number | undefined {
        if (event == null) {
            return 0;
        }

        return event.results.value.map(x => x.timestamp).sort((a, b) => a - b).pop();
    }
}
