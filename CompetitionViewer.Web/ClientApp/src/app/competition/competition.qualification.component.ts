import { Component, OnChanges, SimpleChanges, Input, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { RaceEventMessage, RaceEventResultMessage } from '../../models/racemessages';
import { RaceEvent, RaceClassDefiningProperty, RaceClass, EliminatorType } from '../../models/models';
import { RaceUtils } from '../../util/raceUtils';
import { CompetitionService } from '../../services/competitionService';
import { Subscription } from 'rxjs';
import { C } from '@angular/cdk/keycodes';
import { isNullOrUndefined, isUndefined } from 'util';

@Component({
    selector: 'competition-qualification',
    templateUrl: './competition.qualification.component.html',
    styleUrls: ['./competition.component.css'],
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
        if (clickItem != null) {
            setTimeout(() => {
                this.selectedClass = clickItem;
                this.invalidateCanvas();
            }, 200);
        } else {
            this.selectedClass = null;
            this.invalidateCanvas();
        }
    }

    public invalidate(messages: RaceEventMessage[]) {
        let selected = this.selectedClass;
        this.classViewModels = [];

        for (const message of messages) {
            for (const result of message.results) {
                this.updateWithMessage(message, result);
            }
        }

        this.classViewModels.forEach(x => x.update());

        if (selected != null) {
            this.selectedClass = this.classViewModels.find(x => x.classData.id == selected?.classData.id) ?? null;
        }

        this.invalidateCanvas();
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

        existingClassVM.updateMessage(message, result, this.selectedEvent);
    }

    private getMatchInfo(): BracketInfo | null {
        if (this.selectedEvent == null || this.selectedClass == null) {
            return null;
        }

        let classData = this.selectedClass.classData;
        let participants = this.selectedClass.qualificationPositions.filter(x => !x.isRemoved);
        let seeds = this.getSeeds(participants.length, classData.eliminatorType);
        if (seeds == null) {
            return null;
        }

        let roundCount = Math.ceil(Math.log(participants.length) / Math.log(2));
        let roundInfos = new Array<RoundInfo>();

        for (let round = 1; round <= roundCount; round++) {
            let matches = new Array<MatchInfo>();

            for (var i = 0; i < Math.pow(2, roundCount) / Math.pow(2, round - 1) / 2; i++) {
                matches.push({
                    firstSeed: null,
                    secondSeed: null
                });
            }

            if (round == 1) {
                let qualificationRacers = participants.map((x, i) => ({ racer: x, seed: i + 1 }));

                for (let i = 0; i < seeds.length; i++) {
                    let seedMatch = seeds[i];

                    matches[i] = {
                        firstSeed: seedMatch.firstSeed == null ? null : qualificationRacers[seedMatch.firstSeed - 1].racer,
                        secondSeed: seedMatch.secondSeed == null ? null : qualificationRacers[seedMatch.secondSeed - 1].racer,
                    }
                }
            } else {
                let foundMatches = this.findMatches(this.selectedClass.eliminatorResults, round, roundInfos);
                for (let existingMatch of foundMatches) {
                    let newMatchIndex = Math.floor(existingMatch.lastMatchIndex / 2);

                    if (existingMatch.lastMatchIndex % 2 == 0) {
                        matches[newMatchIndex].firstSeed = existingMatch.raceData;
                    } else {
                        matches[newMatchIndex].secondSeed = existingMatch.raceData;
                    }
                }
            }

            roundInfos.push({
                roundIndex: round,
                matches: matches
            });
        }

        let winner: RaceResultData | null = null;
        let winnerMatches = this.findMatches(this.selectedClass.eliminatorResults, roundCount + 1, roundInfos);
        if (winnerMatches.length == 1) {
            winner = winnerMatches[0].raceData;
        }

        return {
            rounds: roundInfos,
            winner: winner
        };
    }

    private findMatches(eliminatorResults: RaceResultData[], round: number, roundInfos: RoundInfo[]): { lastMatchIndex: number, raceData: RaceResultData }[] {
        let list = new Array<({ lastMatchIndex: number, raceData: RaceResultData })>();

        for (let finishedMatch of eliminatorResults) {
            let stageInfo = RaceUtils.getStage(finishedMatch.round);
            if (stageInfo?.round == round - 1 && finishedMatch.raceData.result == 0) {
                let lastRoundMatches = roundInfos[round - 2].matches.map(x => ({
                    firstSeed: (x.firstSeed as QualificationPosition)?.racerId ?? (x.firstSeed as RaceResultData)?.raceData?.racerId,
                    secondSeed: (x.secondSeed as QualificationPosition)?.racerId ?? (x.secondSeed as RaceResultData)?.raceData?.racerId
                }));

                let lastMatchIndex = lastRoundMatches.findIndex(y => y.firstSeed == finishedMatch.raceData.racerId || y.secondSeed == finishedMatch.raceData.racerId);
                if (lastMatchIndex != -1) {
                    list.push({
                        lastMatchIndex: lastMatchIndex,
                        raceData: finishedMatch
                    });
                }
            }
        }

        return list;
    }

    private getSeeds(participantCount: number, eliminatorType: EliminatorType): SeedMatch[] | null {
        let seedData = this.getSeedData(participantCount, eliminatorType);
        if (seedData == null) {
            return null;
        }

        let seeds = seedData.split(" ").map(x => x == "x" ? null : Number.parseInt(x));
        let matchArray = new Array<SeedMatch>();

        for (var i = 0; i < seeds.length; i += 2) {
            matchArray.push({ firstSeed: seeds[i], secondSeed: seeds[i + 1] });
        }

        return matchArray;
    }

    private getSeedData(participantCount: number, eliminatorType: EliminatorType): string | null {
        if (eliminatorType == EliminatorType.Sportsman) {
            switch (participantCount) {
                case 2: return "1 2";
                case 3: return "1 x 2 3";
                case 4: return "1 3 2 4";
                case 5: return "1 x 3 5 2 4 x x";
                case 6: return "1 4 x x 2 5 3 6";
                case 7: return "1 x 3 6 2 5 4 7";
                case 8: return "1 5 3 7 2 6 4 8";
                case 9: return "1 x 4 8 2 6 x x 3 7 5 9 x x x x";
                case 10: return "1 6 x x 3 8 5 10 2 7 4 9 x x x x";
                case 11: return "1 x 4 9 3 8 6 11 2 7 5 10 x x x x";
                case 12: return "1 7 4 10 x x x x 2 8 5 11 3 9 6 12";
                case 13: return "1 x 5 11 3 9 6 12 2 8 x x 4 10 7 13";
                case 14: return "1 8 x x 3 10 6 13 2 9 5 12 4 11 7 14";
                case 15: return "1 x 5 12 3 10 7 14 2 9 6 13 4 11 8 15";
                case 16: return "1 9 5 13 7 15 3 11 2 10 6 14 8 16 4 12";
                case 17: return "1 x 6 14 4 12 8 16 x x x x x x x x 2 10 x x 5 13 9 17 3 11 7 15 x x x x";
                case 18: return "1 10 x x 4 13 8 17 2 11 6 15 x x x x 3 12 7 16 5 14 9 18 x x x x x x x x";
                case 19: return "1 x 6 15 4 13 9 18 2 11 7 16 x x x x 3 12 8 17 5 14 10 19 x x x x x x x x";
                case 20: return "1 11 6 16 x x x x 3 13 8 18 5 15 10 20 2 12 7 17 4 14 9 19 x x x x x x x x";
            }
        } else if (eliminatorType == EliminatorType.Pro) {
            switch (participantCount) {
                case 2: return "1 2";
                case 3: return "1 x 2 3";
                case 4: return "1 4 2 3";
                case 5: return "1 x 3 4 2 5 x x";
            }
        }

        return null;
    }

    private invalidateCanvas() {
        let ctx = this.canvas?.nativeElement?.getContext("2d");
        if (ctx == null) {
            return;
        }

        this.canvas.nativeElement.width = 100;
        this.canvas.nativeElement.height = 100;
        ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);

        let matchInfo = this.getMatchInfo();
        if (matchInfo == null) {
            return;
        }

        let rounds = matchInfo.rounds.length;

        let boxWidth = 160;
        let boxHeight = 40;
        let boxMargin = boxWidth * 0.25;
        let startMargin = boxWidth * 0.25;

        this.canvas.nativeElement.width = boxWidth * (rounds + 1) + boxMargin - boxMargin * (rounds - 1) + startMargin;
        this.canvas.nativeElement.height = boxHeight * 1.5 * matchInfo.rounds[0].matches.length * 2;

        for (let i = 0; i < matchInfo.rounds.length; i++) {
            let round = matchInfo.rounds[i];
            let groupSize = round.matches.length * 2;
            let prevRound = i == 0 ? null : matchInfo.rounds[i - 1];

            for (let matchIndex = 0; matchIndex < round.matches.length; matchIndex++) {
                let match = round.matches[matchIndex];
                let isByeFirstSeed = this.isByeRound(matchInfo.rounds, i, matchIndex, 0, 0);
                let isByeSecondSeed = this.isByeRound(matchInfo.rounds, i, matchIndex, 1, 0);

                this.drawBox(match.firstSeed, ctx, prevRound, round.roundIndex, isByeFirstSeed, i, matchIndex * 2, 0, boxWidth, boxHeight, boxMargin, startMargin, groupSize);
                this.drawBox(match.secondSeed, ctx, prevRound, round.roundIndex, isByeSecondSeed, i, matchIndex * 2 + 1, 1, boxWidth, boxHeight, boxMargin, startMargin, groupSize);
            }
        }

        this.drawBox(matchInfo.winner, ctx, matchInfo.rounds[matchInfo.rounds.length - 1], matchInfo.rounds.length, false, matchInfo.rounds.length, 0, 0, boxWidth, boxHeight, boxMargin, startMargin, 1);
    }

    private isByeRound(rounds: RoundInfo[], roundIndex: number, matchIndex: number, seed: number, iteration: number) {
        if (roundIndex == 0 && iteration == 0) {
            return false;
        }

        if (roundIndex == 0) {
            return true;
        }

        let prevMatchIndex = matchIndex * 2 + seed;
        let prevMatchSeed = rounds[roundIndex - 1].matches[prevMatchIndex];

        if (prevMatchSeed.firstSeed !== null || prevMatchSeed.secondSeed !== null) {
            return false;
        }

        return this.isByeRound(rounds, roundIndex - 1, prevMatchIndex, seed, iteration + 1);
    }

    private drawBox(seed: QualificationPosition | RaceResultData | null, ctx: CanvasRenderingContext2D, prevRound: RoundInfo | null, roundIndex: number, isBye: boolean, xIndex: number, yIndex: number, seedIndex: number, boxWidth: number, boxHeight: number, boxMargin: number, startMargin: number, groupSize: number) {
        let firstBoxX = this.getBoxX(xIndex, boxWidth, boxMargin, startMargin);
        let firstBoxY = this.getBoxY(yIndex, groupSize, boxHeight);

        ctx.strokeStyle = "black";
        ctx.fillStyle = "gray";
        ctx.lineWidth = 1;

        if ((roundIndex == 1 && seed == null) || isBye) {
            ctx.fillRect(firstBoxX, firstBoxY, boxWidth, boxHeight);
        }

        ctx.strokeRect(firstBoxX, firstBoxY, boxWidth, boxHeight);

        ctx.fillStyle = "black";
        ctx.lineWidth = 3;
        ctx.font = '15px verdana';

        if (seed != null) {
            ctx.textAlign = "start";
            ctx.textBaseline = "top";

            let id = (seed as QualificationPosition)?.racerId ?? (seed as RaceResultData)?.raceData?.racerId;
            let reactionTime = (seed as QualificationPosition)?.reactionTime ?? (seed as RaceResultData)?.raceData?.reactionTime;
            let finishTime = (seed as QualificationPosition)?.finishTime ?? (seed as RaceResultData)?.raceData?.finishTime;

            ctx.fillText(id, firstBoxX + boxWidth * 0.05, firstBoxY + boxHeight * 0.1, boxWidth);

            ctx.textBaseline = "bottom";
            ctx.fillText(reactionTime?.toFixed(5) ?? "---", firstBoxX + boxWidth * 0.05, firstBoxY + boxHeight - boxHeight * 0.1, boxWidth);

            ctx.textAlign = "end";
            ctx.fillText(finishTime?.toFixed(5) ?? "---", firstBoxX + boxWidth - boxWidth * 0.05, firstBoxY + boxHeight - boxHeight * 0.1, boxWidth);
        }

        ctx.lineWidth = 1;

        if ((roundIndex == 1 && seed == null) || isBye) {
            ctx.strokeStyle = "gray";
        } else {
            ctx.strokeStyle = "black";
        }

        let currentX = firstBoxX + boxWidth;
        let currentY = firstBoxY + boxHeight / 2;
        let connectingLineOffset = 3 * boxWidth / 4;
        let nextBoxCenterX = this.getBoxX(xIndex + 1, boxWidth, boxMargin, startMargin) + connectingLineOffset;
        let nextBoxCenterY = this.getBoxY(Math.floor(yIndex / 2), groupSize / 2, boxHeight);

        if (yIndex % 2 == 1) {
            nextBoxCenterY += boxHeight;
        }

        ctx.beginPath();
        ctx.moveTo(currentX, currentY);
        ctx.lineTo(nextBoxCenterX, currentY)
        ctx.lineTo(nextBoxCenterX, nextBoxCenterY)
        ctx.stroke();

        let raceData = seed as RaceResultData;
        if (prevRound != null && raceData != null && raceData.opponentData !== undefined && raceData.raceData.result == 0) {
            let resultDifferences = raceData
                .opponentData
                .map(x => RaceUtils.getTimeDifference(raceData.raceData, x))
                .filter(x => x != null)
                .map(x => <number>x);

            if (resultDifferences.length > 0) {
                let minDiff = Math.min(...resultDifferences);
                let prevRace = prevRound.matches.find(x => x.firstSeed?.racerId == seed?.racerId || x.secondSeed?.racerId == seed?.racerId);
                if (prevRace != undefined) {
                    let seedOffset = prevRace.firstSeed?.racerId == raceData.racerId ? 0 : 1;
                    let prevYIndex = yIndex * 2 + seedOffset;
                    let prevBoxCenterX = this.getBoxX(xIndex - 1, boxWidth, boxMargin, startMargin) + boxWidth;
                    let prevBoxCenterY = this.getBoxY(prevYIndex, groupSize * 2, boxHeight) + boxHeight / 2;

                    ctx.fillStyle = "black";
                    ctx.lineWidth = 3;
                    ctx.font = '15px verdana';
                    ctx.textAlign = "left";

                    if (seedOffset == 0) {
                        ctx.textBaseline = "bottom";
                    } else {
                        ctx.textBaseline = "top";
                        prevBoxCenterY += 2;
                    }

                    ctx.fillText(minDiff.toFixed(5), prevBoxCenterX + 5, prevBoxCenterY, connectingLineOffset);
                }
            }
        }

        let pos = seed as QualificationPosition;
        if (pos != null && pos.qualifyingPosition !== undefined && pos.qualifyingPosition !== -1) {
            ctx.fillStyle = "black";
            ctx.lineWidth = 3;
            ctx.font = '15px verdana';
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            ctx.fillText(pos.qualifyingPosition + ".", startMargin / 2, firstBoxY + boxHeight / 2, startMargin);
        }
    }

    private getBoxX(roundIndex: number, boxWidth: number, boxMargin: number, startMargin: number): number {
        let x = startMargin + roundIndex * boxWidth;

        if (roundIndex > 0) {
            x -= boxMargin * (roundIndex - 2);
        }

        return x;
    }

    private getBoxY(index: number, groupSize: number, boxHeight: number): number {
        let currentBoxAreaheight = this.canvas.nativeElement.height / groupSize;

        return index * currentBoxAreaheight + currentBoxAreaheight / 2 - boxHeight / 2;
    }
}

interface BracketInfo {
    rounds: RoundInfo[];
    winner: RaceResultData | null;
}

interface RoundInfo {
    roundIndex: number;
    matches: MatchInfo[];
}

interface MatchInfo {
    firstSeed: QualificationPosition | RaceResultData | null;
    secondSeed: QualificationPosition | RaceResultData | null;
}

export class QualificationClassViewModel {
    public qualificationPositions: QualificationPosition[] = [];
    public eliminatorResults: RaceResultData[] = [];

    constructor(public classData: RaceClass) {
    }

    public updateMessage(message: RaceEventMessage, result: RaceEventResultMessage, event: RaceEvent) {
        if (this.classData.qualificationDefiningProperty == RaceClassDefiningProperty.Invalid) {
            return;
        }

        let currentTime = this.getCurrentTime(result, this.classData);
        let stage = RaceUtils.getStage(message.round)?.name;
        if (stage == event.eventInfo.qualifyingStageKey) {
            let existingItem = this.qualificationPositions.find(x => x.racerId == result.racerId);

            if (existingItem == undefined) {
                existingItem = {
                    racerId: result.racerId,
                    reactionTime: null,
                    finishTime: null,
                    bestTime: null,
                    qualifyingPosition: -1,
                    isRemoved: false
                };

                this.qualificationPositions.push(existingItem);
            }

            if (currentTime != null && ((this.classData.qualificationDefiningProperty == RaceClassDefiningProperty.QuarterMileTime && currentTime > 0) || (this.classData.qualificationDefiningProperty == RaceClassDefiningProperty.ReactionTime && currentTime >= 0) || (this.classData.qualificationDefiningProperty == RaceClassDefiningProperty.DialInMargin && currentTime > 0))) {
                if ((existingItem.bestTime == null || currentTime < existingItem.bestTime) && (this.classData.classIndex == null || currentTime >= this.classData.classIndex.QuarterMileIndex)) {
                    existingItem.reactionTime = result.reactionTime;
                    existingItem.finishTime = result.finishTime;
                    existingItem.bestTime = currentTime;
                }
            }
        } else if (stage == event.eventInfo.eliminatorStageKey) {
            this.eliminatorResults.push({
                raceData: result,
                opponentData: message.results.filter(x => x.racerId != result.racerId),
                raceId: message.raceId,
                racerId: result.racerId,
                round: message.round,
                bestTime: currentTime
            });
        }
    }

    public update() {
        this.qualificationPositions.sort((a, b) => {
            if (a.bestTime == null) {
                return 1;
            }

            if (b.bestTime == null) {
                return -1;
            }

            return a.bestTime - b.bestTime;
        });

        this.qualificationPositions.forEach((val, i) => val.qualifyingPosition = i + 1);
        this.updateRemovedQualifiers();
    }

    private updateRemovedQualifiers() {
        let eliminatorRound = this.getCurrentEliminatorRound();
        if (eliminatorRound === null || eliminatorRound < 2) {
            return;
        }

        for (let qualifier of this.qualificationPositions) {
            let firstRoundEliminator = this.eliminatorResults.find(x => x.raceData.racerId == qualifier.racerId);
            if (firstRoundEliminator == undefined) {
                qualifier.isRemoved = true;
            }
        }
    }

    private getCurrentEliminatorRound(): number | null {
        let roundNumbers = this.eliminatorResults.map(x => RaceUtils.getStage(x.round)?.round ?? -1);
        let maxRound = Math.max(...roundNumbers);

        if (maxRound <= 0) {
            return null;
        }

        return maxRound;
    }

    private getCurrentTime(result: RaceEventResultMessage, raceClass: RaceClass): number | null {
        if (raceClass.qualificationDefiningProperty == RaceClassDefiningProperty.QuarterMileTime) {
            return result.finishTime;
        }

        if (raceClass.qualificationDefiningProperty == RaceClassDefiningProperty.ReactionTime) {
            return result.reactionTime;
        }

        if (raceClass.qualificationDefiningProperty == RaceClassDefiningProperty.DialInMargin) {
            if (result.finishTime !== null && result.finishTime !== undefined && result.dialIn !== null && result.dialIn !== undefined) {
                return result.finishTime - result.dialIn;
            }
        }

        return null;
    }
}

export interface RaceResultData {
    raceData: RaceEventResultMessage;
    opponentData: RaceEventResultMessage[];
    racerId: string;
    raceId: string;
    round: string;
    bestTime: number | null;
}

export interface QualificationPosition {
    qualifyingPosition: number;
    racerId: string;
    reactionTime: number | null;
    finishTime: number | null;
    bestTime: number | null;
    isRemoved: boolean;
}

interface SeedMatch {
    firstSeed: number | null;
    secondSeed: number | null;
}
