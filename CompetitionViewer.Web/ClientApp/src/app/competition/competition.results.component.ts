import { Component, Input, OnChanges, SimpleChanges, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { RaceEvent } from '../../models/models';
import { RaceEventMessage, RaceEventResultMessage } from '../../models/racemessages';
import { RaceUtils } from '../../util/raceUtils';
import { Binary } from '@angular/compiler';
import { MatTableDataSource } from '@angular/material/table';
import { DataSource } from '@angular/cdk/table';
import { CollectionViewer } from '@angular/cdk/collections';
import { Observable, BehaviorSubject, Subscription, fromEvent, merge } from 'rxjs';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ActivatedRoute } from '@angular/router';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CompetitionService } from '../../services/competitionService';
import { LanePipe, MyNumberPipe, RaceResultPipe } from './competition.pipes';
import { DatePipe, DecimalPipe } from '@angular/common';

@Component({
    selector: 'competition-results',
    templateUrl: './competition.results.component.html',
})
export class CompetitionResultsComponent implements OnInit, AfterViewInit, OnDestroy {
    private dataSource = new MatTableDataSource<RaceMessageViewModel>([]);
    private subscription: Subscription | null;

    public columns: ColumnData[];
    public isAscending = false;

    @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
    @ViewChild(MatSort, { static: true }) sort: MatSort;
    @ViewChild('input') input: ElementRef;

    constructor(private competitionService: CompetitionService, private datePipe: DatePipe, private decimalPipe: DecimalPipe) {
        this.columns = [
            { id: "timestamp", isHidden: false, name: "Timestamp", type: ColumnType.Default },
            { id: "raceId", isHidden: false, name: "Race ID", type: ColumnType.Default },
            { id: "round", isHidden: false, name: "Round", type: ColumnType.Default },
            { id: "racerId", isHidden: false, name: "Racer ID", type: ColumnType.Default },
            { id: "lane", isHidden: false, name: "Lane", type: ColumnType.Default },
            { id: "result", isHidden: false, name: "Result", type: ColumnType.Default  },
            { id: "reactionTime", isHidden: false, name: "RT", type: ColumnType.RoundedNumber },
            { id: "sixtyFeetTime", isHidden: false, name: "60ft", type: ColumnType.RoundedNumber  },
            { id: "threeThirtyFeetTime", isHidden: false, name: "330ft", type: ColumnType.RoundedNumber  },
            { id: "sixSixtyFeetTime", isHidden: false, name: "660ft", type: ColumnType.RoundedNumber  },
            { id: "sixSixtyFeetSpeed", isHidden: false, name: "660ft Speed", type: ColumnType.RoundedNumber  },
            { id: "thousandFeetTime", isHidden: false, name: "1000ft", type: ColumnType.RoundedNumber },
            { id: "thousandFeetSpeed", isHidden: false, name: "1000ft Speed", type: ColumnType.RoundedNumber  },
            { id: "finishTime", isHidden: false, name: "ET", type: ColumnType.RoundedNumber  },
            { id: "finishSpeed", isHidden: false, name: "ET Speed", type: ColumnType.RoundedNumber },
            { id: "dialIn", isHidden: false, name: "Dial In", type: ColumnType.RoundedNumber },
            { id: "dialInAccuracy", isHidden: false, name: "Dial In difference", type: ColumnType.SignedNumber },
            { id: "timeDifference", isHidden: false, name: "RT+ET difference", type: ColumnType.SignedNumber }
        ];
    }

    public format(item: any, column: ColumnData): any {
        if (column.id == "lane") {
            return new LanePipe().transform(item);
        }

        if (column.id == "timestamp") {
            return this.datePipe.transform(item, "yyyy-MM-dd HH:mm:ss");
        }

        if (column.id == "result") {
            return new RaceResultPipe().transform(item);
        }

        if (column.type == ColumnType.SignedNumber) {
            return new MyNumberPipe().transform(item, null);
        }

        if (column.type == ColumnType.RoundedNumber) {
            return this.decimalPipe.transform(item);
        }

        return item;
    }

    public getDisplayedColumns() {
        return this.columns.filter(x => !x.isHidden);
    }

    public getDisplayedColumnNames() {
        return this.getDisplayedColumns().map(x => x.id);
    }

    public getDisplayedColumnsSecondHeaders() {
        return this.getDisplayedColumns().map(x => x.id + "-buttons");
    }

    public onButton() {
        if (this.isAscending) {
            this.columns.sort((a, b) => a.id.localeCompare(b.id));
            this.isAscending = false;
        } else {
            this.columns.sort((a, b) => b.id.localeCompare(a.id));
            this.isAscending = true;
        }
    }

    ngOnInit() {
        this.subscription = this.competitionService.filteredMessages.subscribe(x => this.dataSource.data = this.map(x, this.getFilters(this.sort)));

        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;
    }

    public ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
    }

    public ngAfterViewInit() {
        this.sort.sortChange.subscribe(() => {
            this.paginator.pageIndex = 0;
            this.dataSource.data = this.map(this.competitionService.filteredMessages.value, this.getFilters(this.sort));
        });

        //fromEvent(this.input.nativeElement, 'keyup')
        //    .pipe(
        //        debounceTime(150),
        //        distinctUntilChanged(),
        //        tap(() => {
        //            this.paginator.pageIndex = 0;
        //            this.dataSource.data = this.map(this.competitionService.filteredMessages.value, this.getFilters(this.sort));
        //        })
        //    )
        //    .subscribe();
    }

    private getFilters(sort: MatSort): ((item: RaceMessageViewModel) => boolean)[] {
        let filters = new Array<((item: RaceMessageViewModel) => boolean)>();
        let raceProperties = ["reactionTime", "sixtyFeetTime", "threeThirtyFeetTime", "sixSixtyFeetTime", "sixSixtyFeetSpeed", "thousandFeetTime", "thousandFeetSpeed", "finishTime", "finishSpeed", "dialIn", "dialInAccuracy", "timeDifference"];

        if (raceProperties.includes(sort.active)) {
            filters.push(x => x.racerId != null && x.racerId.toUpperCase() != "BYE");

            if (sort.active == "reactionTime") {
                filters.push(x => x[sort.active] >= 0);
            } else {
                filters.push(x => x[sort.active] > 0);
            }

            filters.push(x => x[sort.active] < 1000);
        }

        return filters;
    }

    public hideColumn(columnName: string) {
        let column = this.columns.find(x => x.id == columnName);
        if (column != undefined) {
            column.isHidden = true;
        }
    }

    public dropColumn($event: any) {
        console.log(event);
        const fromIndex: number = this.columns.findIndex(x => x.id == $event.previousContainer.id);
        const toIndex: number = this.columns.findIndex(x => x.id == $event.container.id);

        moveItemInArray(this.columns, fromIndex, toIndex);
    }

    private map(messages: RaceEventMessage[], filters: ((item: RaceMessageViewModel) => boolean)[]): RaceMessageViewModel[] {
        let data = new Array<RaceMessageViewModel>();
        let index = 0;

        for (const msg of messages) {
            for (const result of msg.results) {
                let item = {
                    timestamp: msg.timestamp,
                    eventId: msg.eventId,
                    eventName: msg.eventName,
                    raceId: msg.raceId,
                    round: msg.round,

                    dialIn: result.dialIn,
                    finishSpeed: result.finishSpeed,
                    finishTime: result.finishTime,
                    lane: result.lane,
                    racerId: result.racerId,
                    reactionTime: result.reactionTime,
                    result: result.result,
                    sixSixtyFeetSpeed: result.sixSixtyFeetSpeed,
                    sixSixtyFeetTime: result.sixSixtyFeetTime,
                    sixtyFeetTime: result.sixtyFeetTime,
                    thousandFeetSpeed: result.thousandFeetSpeed,
                    thousandFeetTime: result.thousandFeetTime,
                    threeThirtyFeetTime: result.threeThirtyFeetTime,

                    dialInAccuracy: this.getDialInAccuracy(result, msg),
                    timeDifference: this.getTimeDifference(result, msg),

                    index: index
                };

                let canAdd = true;

                for (const filter of filters) {
                    canAdd = canAdd && filter(item);
                }

                if (canAdd) {
                    data.push(item);
                }
            }

            index++;
        }

        return data;
    }

    private getDialInAccuracy(result: RaceEventResultMessage, message: RaceEventMessage): number | null {
        if (result == null || result.finishTime == null) {
            return null;
        }

        if (result.dialIn == 0 || result.dialIn == null) {
            return null;
        }

        return result.finishTime - result.dialIn;
    }

    private getTimeDifference(result: RaceEventResultMessage, message: RaceEventMessage): number | null {
        let winnerResult = message.results.find(x => x.result == 0);

        if (winnerResult == undefined || winnerResult.racerId == result.racerId || winnerResult.racerId.toLowerCase() == "bye" || result.racerId.toLowerCase() == "bye") {
            return null;
        }

        if (result.finishTime == 0) {
            return null;
        }

        if (result.dialIn == null || winnerResult.dialIn == null || result.reactionTime == null || result.finishTime == null || winnerResult.reactionTime == null || winnerResult.finishTime == null) {
            return null;
        }

        if (result.dialIn > 0 || winnerResult.dialIn > 0) {
            let currentResultDialInDifference = result.reactionTime + result.finishTime - result.dialIn;
            let winnerResultDialInDifference = winnerResult.reactionTime + winnerResult.finishTime - winnerResult.dialIn;
            let difference = currentResultDialInDifference - winnerResultDialInDifference;

            return difference;
        } else {
            let currentResultDiff = result.reactionTime + result.finishTime;
            let winnerResultDiff = winnerResult.reactionTime + winnerResult.finishTime;
            let difference = currentResultDiff - winnerResultDiff;

            return difference;
        }
    }
}

export class RaceMessagesDataSource implements DataSource<RaceEventMessage> {
    private messagesSubject = new BehaviorSubject<RaceEventMessage[]>([]);
    private subscription: Subscription | null = null;

    public connect(collectionViewer: CollectionViewer): Observable<RaceEventMessage[] | readonly RaceEventMessage[]> {
        return this.messagesSubject.asObservable();
    }

    public disconnect(collectionViewer: CollectionViewer): void {
        this.messagesSubject.complete();
    }

    public eventChanged(selectedEvent: RaceEvent | null) {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }

        if (selectedEvent == null) {
            this.messagesSubject.next([]);
            return;
        }

        this.subscription = selectedEvent.results.subscribe(
            x => this.messagesSubject.next(x),
            err => { },
            () => this.messagesSubject.next([]));
    }
}

export interface RaceMessageViewModel {
    eventId: string;
    eventName: string;
    raceId: string;
    round: string;
    timestamp: number;

    racerId: string;
    lane: string | null;
    result: number | null;
    dialIn: number | null;
    reactionTime: number | null;
    sixtyFeetTime: number | null;
    threeThirtyFeetTime: number | null;
    sixSixtyFeetTime: number | null;
    sixSixtyFeetSpeed: number | null;
    thousandFeetTime: number | null;
    thousandFeetSpeed: number | null;
    finishTime: number | null;
    finishSpeed: number | null;

    dialInAccuracy: number | null;
    timeDifference: number | null;
}

export interface ColumnData {
    id: string;
    name: string;
    isHidden: boolean;
    type: ColumnType
}

export enum ColumnType {
    Default = 0,
    RoundedNumber = 1,
    SignedNumber = 2
}
