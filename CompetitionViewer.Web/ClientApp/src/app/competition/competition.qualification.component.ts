import { Component, OnChanges, SimpleChanges, Input } from '@angular/core';
import { RaceEventMessage, RaceEventResultMessage } from '../../models/racemessages';
import { RaceEvent, RaceClassDefiningProperty, RaceClass } from '../../models/models';
import { RaceUtils } from '../../util/raceUtils';

@Component({
    selector: 'competition-qualification',
    templateUrl: './competition.qualification.component.html',
})
export class CompetitionQualificationComponent implements OnChanges {
    @Input() public selectedEvent: RaceEvent | null = null;

    public classViewModels: QualificationClassViewModel[] = [];

    public ngOnChanges(changes: SimpleChanges) {
        this.classViewModels = [];

        if (this.selectedEvent == null) {
            return;
        }

        this.invalidate(this.selectedEvent.results.value);
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
        let raceClass = RaceUtils.getClass(result.racerId);

        if (!RaceUtils.isValidRaceClass(raceClass)) {
            return;
        }

        if (!message.round.startsWith("Q")) {
            return;
        }

        let classData = this.selectedEvent.classes.value.find(x => x.id == raceClass);
        let existingClassVM = this.classViewModels.find(x => x.classData.id == raceClass);

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
        if (this.classData.definingProperty == RaceClassDefiningProperty.Invalid) {
            return;
        }

        let currentTime = this.classData.definingProperty == RaceClassDefiningProperty.FinishTime ? result.finishTime : result.reactionTime;
        let existingItemIndex = this.participantPositions.findIndex(x => x.participantId == result.racerId);

        if (existingItemIndex == -1) {
            this.participantPositions.push({
                participantId: result.racerId,
                bestTime: currentTime
            });
        } else if (currentTime < this.participantPositions[existingItemIndex].bestTime) {
            if (this.classData.definingProperty == RaceClassDefiningProperty.FinishTime && currentTime > 0) {
                this.participantPositions[existingItemIndex].bestTime = currentTime;
            } else if (this.classData.definingProperty == RaceClassDefiningProperty.ReactionTime && currentTime >= 0) {
                this.participantPositions[existingItemIndex].bestTime = currentTime;
            }
        }

        this.participantPositions.sort((a, b) => {
            if (this.classData.definingProperty == RaceClassDefiningProperty.FinishTime) {
                if (a.bestTime <= 0) {
                    return 1;
                }
            } else if (this.classData.definingProperty == RaceClassDefiningProperty.ReactionTime) {
                if (a.bestTime < 0) {
                    return 1;
                }
            }

            return a.bestTime - b.bestTime;
        });
    }
}

export interface QualificationPosition {
    participantId: string;
    bestTime: number;
}
