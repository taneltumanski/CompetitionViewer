import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { RaceEvent } from '../../models/models';
import { RaceEventMessage } from '../../models/racemessages';
import { RaceUtils } from '../../util/raceUtils';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { Subscription } from 'rxjs';

@Component({
    selector: 'competition-results',
    templateUrl: './competition.results.component.html',
})
export class CompetitionResultsComponent implements OnChanges {
    @Input() public selectedEvent: RaceEvent | null = null;

    public messages: RaceEventMessage[] = [];

    private subscription: Subscription | null;

    public ngOnChanges(changes: SimpleChanges): void {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }

        if (this.selectedEvent) {
            this.subscription = this.selectedEvent.results.subscribe(x => this.messages = x.concat().sort((a, b) => b.timestamp - a.timestamp));
        }
    }
}
