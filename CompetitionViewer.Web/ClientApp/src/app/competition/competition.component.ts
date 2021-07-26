import { Component } from '@angular/core';
import { CompetitionMessageService } from '../../services/competitionMessageService';
import { RaceEvent, RaceQualificationDefiningProperty, ObservableArray, RaceClass, ClassParticipant, Participant } from '../../models/models';
import { RaceUtils } from '../../util/raceUtils';
import { CompetitionService } from '../../services/competitionService';

@Component({
    selector: 'competition',
    templateUrl: './competition.component.html',
    styleUrls: ['./competition.component.css'],
})
export class CompetitionComponent {
    public eventList: RaceEvent[] = [];
    public selectedEventId: string | undefined;
    private hasEventBeenSelected: boolean = false;

    constructor(private competitionService: CompetitionService) {
        competitionService
            .dataModel
            .events
            .subscribe(x => {
                this.eventList = x.sort((a, b) => a.id.localeCompare(b.id));

                if (this.selectedEventId != undefined) {
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
                this.selectedEventId = x == undefined ? undefined : x.id;
            });
    }

    onSelectedEventChange() {
        this.hasEventBeenSelected = true;
        this.competitionService.selectEvent(this.selectedEventId);
    }
}
