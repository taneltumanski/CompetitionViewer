import { Component, Input } from '@angular/core';
import { RaceEvent } from '../../models/models';
import { CompetitionService } from '../../services/competitionService';

@Component({
    selector: 'competition-eventInfo',
    templateUrl: './competition.eventInfo.component.html',
})
export class CompetitionEventInfoComponent {
    public selectedEvent: RaceEvent | undefined;

    constructor(competitionService: CompetitionService) {
        competitionService
            .selectedEvent
            .subscribe(x => this.selectedEvent = x);
    }

    public getParticipantCount(event: RaceEvent | undefined): number {
        if (event == undefined) {
            return 0;
        }

        return event.classes.value.reduce((acc, val) => acc + val.participants.value.length, 0);
    }

    public getRaceCount(event: RaceEvent | undefined): number {
        if (event == undefined) {
            return 0;
        }

        return event.results.value.length;
    }

    public getFirstDate(event: RaceEvent | undefined): number | undefined {
        if (event == undefined) {
            return 0;
        }

        return event.results.value.map(x => x.timestamp).sort((a, b) => b - a).pop();
    }

    public getLastDate(event: RaceEvent | undefined): number | undefined {
        if (event == undefined) {
            return 0;
        }

        return event.results.value.map(x => x.timestamp).sort((a, b) => a - b).pop();
    }
}
