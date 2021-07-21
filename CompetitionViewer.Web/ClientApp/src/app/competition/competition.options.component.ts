import { Component, Input } from '@angular/core';
import { RaceEvent } from '../../models/models';
import { CompetitionMessageService } from '../../services/competitionMessageService';
import { CompetitionService } from '../../services/competitionService';

@Component({
    selector: 'competition-options',
    templateUrl: './competition.options.component.html',
})
export class CompetitionOptionsComponent {
    public selectedEvent: RaceEvent | undefined;

    constructor(private competitionService: CompetitionService, private messageService: CompetitionMessageService) {
        competitionService
            .selectedEvent
            .subscribe(x => this.selectedEvent = x);
    }

    public updateEvent(event: RaceEvent) {
        this.messageService.requestEventUpdate(event.id);
    }

    public updateAllEvents() {
        this.messageService.requestAllEventUpdates();
    }
}
