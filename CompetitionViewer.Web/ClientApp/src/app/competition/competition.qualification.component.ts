import { Component, OnChanges, SimpleChanges, Input } from '@angular/core';
import { RaceEventMessage, RaceEventResultMessage } from '../../models/racemessages';
import { RaceEvent, RaceClassDefiningProperty, RaceClass } from '../../models/models';
import { RaceUtils } from '../../util/raceUtils';
import { CompetitionService } from '../../services/competitionService';

@Component({
    selector: 'competition-qualification',
    templateUrl: './competition.qualification.component.html',
})
export class CompetitionQualificationComponent {
    public selectedEvent: RaceEvent | null = null;
    public classViewModels: QualificationClassViewModel[] = [];

    constructor(competitionService: CompetitionService) {
        competitionService
            .selectedEvent
            .subscribe(x => {
                this.selectedEvent = x;
                this.classViewModels = [];

                if (this.selectedEvent != null) {
                    this.invalidate(this.selectedEvent.results.value);
                }
            });
    }

    public invalidate(messages: RaceEventMessage[]) {
        this.classViewModels = [];

        for (const message of messages) {
            for (const result of message.results) {
                this.updateWithMessage(message, result);
            }
        }
    }

    private updateWithMessage(message: RaceEventMessage, result: RaceEventResultMessage) {
        if (this.selectedEvent == null) {
            return;
        }

        let raceClass = RaceUtils.getClass(result.racerId, "GENERAL");

        if (!RaceUtils.isValidRaceClass(raceClass)) {
            return;
        }

        if (!message.round.startsWith("Q")) {
            return;
        }

        let classData = this.selectedEvent.classes.value.find(x => x.id == raceClass);
        let existingClassVM = this.classViewModels.find(x => x.classData.id == raceClass);

        if (classData == undefined) {
            return;
        }

        if (existingClassVM == undefined) {
            existingClassVM = new QualificationClassViewModel(classData);

            this.classViewModels.push(existingClassVM);
        }

        existingClassVM.update(result);
    }
}

export class QualificationClassViewModel {
    public participantPositions: QualificationPosition[] = [];

    constructor(public classData: RaceClass) {
    }

    public update(result: RaceEventResultMessage) {
        if (this.classData.qualificationDefiningProperty == RaceClassDefiningProperty.Invalid) {
            return;
        }

        let currentTime = this.classData.qualificationDefiningProperty == RaceClassDefiningProperty.QuarterMileTime ? result.finishTime : result.reactionTime;
        let existingItem = this.participantPositions.find(x => x.participantId == result.racerId);

        if (existingItem == undefined) {
            existingItem = {
                participantId: result.racerId,
                bestTime: null
            };

            this.participantPositions.push(existingItem);
        }

        if (currentTime != null && ((this.classData.qualificationDefiningProperty == RaceClassDefiningProperty.QuarterMileTime && currentTime > 0) || (this.classData.qualificationDefiningProperty == RaceClassDefiningProperty.ReactionTime && currentTime >= 0))) {
            if (existingItem.bestTime == null || currentTime < existingItem.bestTime) {
                existingItem.bestTime = currentTime;
            }
        }

        this.participantPositions.sort((a, b) => {
            if (a.bestTime == null) {
                return 1;
            }

            if (b.bestTime == null) {
                return -1;
            }

            return a.bestTime - b.bestTime;
        });
    }
}

export interface QualificationPosition {
    participantId: string;
    bestTime: number | null;
}
