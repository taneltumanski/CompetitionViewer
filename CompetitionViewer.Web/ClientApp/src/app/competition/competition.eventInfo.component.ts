import { Component, Input } from '@angular/core';
import { RaceEvent } from '../../models/models';

@Component({
    selector: 'competition-eventInfo',
    templateUrl: './competition.eventInfo.component.html',
})
export class CompetitionEventInfoComponent {
    @Input() public selectedEvent: RaceEvent | null = null;

    public getParticipantCount(event: RaceEvent): number {
        return event.classes.value.reduce((acc, val) => acc + val.participants.value.length, 0);
    }

    public getRaceCount(event: RaceEvent): number {
        return event.results.value.reduce((acc, val) => acc + 1, 0);
    }
}
