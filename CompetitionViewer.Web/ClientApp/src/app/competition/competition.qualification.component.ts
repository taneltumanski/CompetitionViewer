import { Component, OnChanges, SimpleChanges, Input, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { RaceEventMessage, RaceEventResultMessage } from '../../models/racemessages';
import { RaceEvent, RaceClassDefiningProperty, RaceClass } from '../../models/models';
import { RaceUtils } from '../../util/raceUtils';
import { CompetitionService } from '../../services/competitionService';
import { Subscription } from 'rxjs';
import { C } from '@angular/cdk/keycodes';

@Component({
    selector: 'competition-qualification',
    templateUrl: './competition.qualification.component.html',
})
export class CompetitionQualificationComponent implements OnInit {
    public selectedEvent: RaceEvent | null = null;
    public selectedClass: QualificationClassViewModel | null = null;
    public classViewModels: QualificationClassViewModel[] = [];

    private subscription: Subscription | null;

    @ViewChild('canvas', { static: true })
    canvas: ElementRef<HTMLCanvasElement>;

    constructor(private competitionService: CompetitionService) {
    }

    ngOnInit(): void {
        this.competitionService
            .selectedEvent
            .subscribe(x => {
                this.selectedEvent = x;
                this.classViewModels = [];
                this.invalidateCanvas();

                if (this.subscription != null) {
                    this.subscription.unsubscribe();
                    this.subscription = null;
                }

                if (this.selectedEvent != null) {
                    this.subscription = this.selectedEvent.results.subscribe(x => this.invalidate(x));
                }
            });
    }

    public onClassClick(clickItem: QualificationClassViewModel | null) {
        this.selectedClass = clickItem;

        this.invalidateCanvas();
    }

    public invalidate(messages: RaceEventMessage[]) {
        this.classViewModels = [];

        for (const message of messages) {
            for (const result of message.results) {
                this.updateWithMessage(message, result);
            }
        }

        this.invalidateBrackets();
        this.invalidateCanvas();
    }

    private invalidateBrackets() {
        for (let classModel of this.classViewModels) {
            classModel.invalidateBracket();
        }
    }

    private invalidateCanvas() {
        let ctx = this.canvas?.nativeElement?.getContext("2d");
        if (ctx == null) {
            return;
        }

        this.canvas.nativeElement.width = 100;
        this.canvas.nativeElement.height = 100;
        ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);

        if (this.selectedEvent == null) {
            return;
        }

        let rounds = 1;

        let groupSize = Math.pow(2, rounds);
        let boxWidth = 160;
        let boxHeight = 40;
        let boxMargin = boxWidth * 0.25;

        this.canvas.nativeElement.width = boxWidth * (rounds + 1) + boxMargin - boxMargin * (rounds - 1);
        this.canvas.nativeElement.height = boxHeight * 1.5 * groupSize;

        if (this.selectedClass != null) {
            let roundIndex = 0;

            while (groupSize >= 1) {
                for (var i = 0; i < groupSize; i++) {
                    let boxX = this.getBoxX(roundIndex, boxWidth, boxMargin);
                    let boxY = this.getBoxY(i, groupSize, boxHeight);

                    ctx.strokeStyle = "black";
                    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

                    if (groupSize > 1) {
                        ctx.strokeStyle = "black";

                        let currentX = boxX + boxWidth;
                        let currentY = boxY + boxHeight / 2;
                        let nextBoxCenterX = this.getBoxX(roundIndex + 1, boxWidth, boxMargin) + boxWidth / 3;
                        let nextBoxCenterY = this.getBoxY(Math.floor(i / 2), groupSize / 2, boxHeight);

                        if (i % 2 == 1) {
                            nextBoxCenterY += boxHeight;
                        }

                        ctx.beginPath();
                        ctx.moveTo(currentX, currentY);
                        ctx.lineTo(nextBoxCenterX, currentY)
                        ctx.lineTo(nextBoxCenterX, nextBoxCenterY)
                        ctx.stroke();
                    }
                }

                groupSize /= 2;
                roundIndex++;
            }
        }
    }

    private getBoxX(roundIndex: number, boxWidth: number, boxMargin: number): number {
        let x = roundIndex * boxWidth;

        if (roundIndex > 0) {
            x -= boxMargin * (roundIndex - 2);
        }

        return x;
    }

    private getBoxY(index: number, groupSize: number, boxHeight: number): number {
        let currentBoxAreaheight = this.canvas.nativeElement.height / groupSize;

        return index * currentBoxAreaheight + currentBoxAreaheight / 2 - boxHeight / 2;
    }

    private updateWithMessage(message: RaceEventMessage, result: RaceEventResultMessage) {
        if (this.selectedEvent == null) {
            return;
        }

        let raceClass = RaceUtils.getClass(result.racerId, "GENERAL");

        if (!RaceUtils.isValidRaceClass(raceClass)) {
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

        existingClassVM.update(message, result, this.selectedEvent);
    }
}

export class QualificationClassViewModel {
    public qualificationPositions: QualificationPosition[] = [];
    public eliminatorResults: RaceEventMessage[] = [];

    constructor(public classData: RaceClass) {
    }

    public update(message: RaceEventMessage, result: RaceEventResultMessage, event: RaceEvent) {
        if (this.classData.qualificationDefiningProperty == RaceClassDefiningProperty.Invalid) {
            return;
        }

        let stage = RaceUtils.getStage(message.round);
        if (stage == event.eventInfo.qualifyingStageKey) {
            let currentTime = this.classData.qualificationDefiningProperty == RaceClassDefiningProperty.QuarterMileTime ? result.finishTime : result.reactionTime;
            let existingItem = this.qualificationPositions.find(x => x.participantId == result.racerId);

            if (existingItem == undefined) {
                existingItem = {
                    participantId: result.racerId,
                    bestTime: null
                };

                this.qualificationPositions.push(existingItem);
            }

            if (currentTime != null && ((this.classData.qualificationDefiningProperty == RaceClassDefiningProperty.QuarterMileTime && currentTime > 0) || (this.classData.qualificationDefiningProperty == RaceClassDefiningProperty.ReactionTime && currentTime >= 0))) {
                if (existingItem.bestTime == null || currentTime < existingItem.bestTime) {
                    existingItem.bestTime = currentTime;
                }
            }

            this.qualificationPositions.sort((a, b) => {
                if (a.bestTime == null) {
                    return 1;
                }

                if (b.bestTime == null) {
                    return -1;
                }

                return a.bestTime - b.bestTime;
            });
        }
        else if (stage == event.eventInfo.eliminatorStageKey) {
            this.eliminatorResults.push(message);
        }
    }

    public invalidateBracket() {
    }
}

export interface QualificationPosition {
    participantId: string;
    bestTime: number | null;
}
