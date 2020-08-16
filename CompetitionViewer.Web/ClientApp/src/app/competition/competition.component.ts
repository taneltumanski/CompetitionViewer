import { Component } from '@angular/core';
import { RaceEventMessage } from '../../models/racemessages';
import { CompetitionMessageService } from '../../services/competitionMessageService';
import { RaceEvent, RaceClassDefiningProperty, ObservableArray, RaceClass, ClassParticipant, Participant } from '../../models/models';
import { RaceUtils } from '../../util/raceUtils';
import { CompetitionService } from '../../services/competitionService';

@Component({
    selector: 'competition',
    templateUrl: './competition.component.html',
    styleUrls: ['./competition.component.css'],
})
export class CompetitionComponent {
    public eventList: RaceEvent[] = [];
    public selectedEventId: string | null = null;
    private hasEventBeenSelected: boolean = false;

    constructor(private competitionService: CompetitionService) {
        competitionService
            .events
            .subscribe(x => {
                this.eventList = x;

                if (this.selectedEventId != null) {
                    let matchingEvent = this.eventList.find(x => x.id == this.selectedEventId);
                    if (matchingEvent == undefined) {
                        this.hasEventBeenSelected = false;
                    }
                }

                if (!this.hasEventBeenSelected && this.eventList.length > 0) {
                    this.selectedEventId = this.eventList[this.eventList.length - 1].id;
                    this.competitionService.selectEvent(this.selectedEventId);
                }
            });

        competitionService
            .selectedEvent
            .subscribe(x => {
                this.selectedEventId = x == null ? null : x.id;
            });
    }

    onSelectedEventChange() {
        this.hasEventBeenSelected = true;
        this.competitionService.selectEvent(this.selectedEventId);
    }
}
