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

    public getParticipantCount(event: RaceEvent): number {
        return event.classes.value.reduce((acc, val) => acc + val.participants.value.length, 0);
    }

    public getRaceCount(event: RaceEvent): number {
        return event.results.value.reduce((acc, val) => acc + 1, 0);
    }

    public getFirstDate(event: RaceEvent): number | undefined {
        return event.results.value.map(x => x.timestamp).sort((a, b) => b - a).pop();
    }

    public getLastDate(event: RaceEvent): number | undefined {
        return event.results.value.map(x => x.timestamp).sort((a, b) => a - b).pop();
    }
}
