import { Component, Input, OnChanges, SimpleChanges, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { RaceEvent } from '../../models/models';
import { RaceEventMessage, RaceEventResultMessage } from '../../models/racemessages';
import { RaceUtils } from '../../util/raceUtils';
import { Binary } from '@angular/compiler';
import { MatTableDataSource } from '@angular/material/table';
import { DataSource } from '@angular/cdk/table';
import { CollectionViewer } from '@angular/cdk/collections';
import { Observable, BehaviorSubject, Subscription, fromEvent, merge, interval } from 'rxjs';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ActivatedRoute } from '@angular/router';
import { debounceTime, distinctUntilChanged, tap, filter, take, sample } from 'rxjs/operators';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CompetitionService } from '../../services/competitionService';
import { LanePipe, MyNumberPipe, RaceResultPipe } from './competition.pipes';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatMenuTrigger } from '@angular/material/menu';

@Component({
    selector: 'competition-results',
    templateUrl: './competition.results.component.html',
    styleUrls: ['./competition.component.css'],
})
export class CompetitionResultsComponent implements OnInit, AfterViewInit, OnDestroy {
    private subscription: Subscription | null;
    private currentContextMenuTarget: HTMLElement | null;
    private snackbarTimeout: NodeJS.Timeout | null;

    public dataSource = new MatTableDataSource<RaceMessageViewModel>([]);
    public filters: FilterData[] = [];
    public columns: ColumnData[] = [];

    public readonly separatorKeysCodes: number[] = [ENTER, COMMA];
    public contextMenuPosition = { x: '0px', y: '0px' };

    @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
    @ViewChild(MatSort, { static: true }) sort: MatSort;
    @ViewChild(MatMenuTrigger, { static: true }) contextMenu: MatMenuTrigger;

    public get FilterType(): typeof FilterType {
        return FilterType;
    }

    constructor(private competitionService: CompetitionService, private datePipe: DatePipe, private decimalPipe: DecimalPipe, private snackBar: MatSnackBar) {
        this.columns = [
            { id: "index", isHidden: false, name: "Index", type: ColumnType.Default },
            { id: "timestamp", isHidden: false, name: "Timestamp", type: ColumnType.Default },
            { id: "raceId", isHidden: false, name: "Race ID", type: ColumnType.Default },
            { id: "round", isHidden: false, name: "Round", type: ColumnType.Default },
            { id: "racerId", isHidden: false, name: "Racer ID", type: ColumnType.Default },
            { id: "lane", isHidden: false, name: "Lane", type: ColumnType.Default },
            { id: "result", isHidden: false, name: "Result", type: ColumnType.Default },
            { id: "reactionTime", isHidden: false, name: "RT", type: ColumnType.RoundedNumber },
            { id: "sixtyFeetTime", isHidden: false, name: "60ft", type: ColumnType.RoundedNumber },
            { id: "threeThirtyFeetTime", isHidden: false, name: "330ft", type: ColumnType.RoundedNumber },
            { id: "sixSixtyFeetTime", isHidden: false, name: "660ft", type: ColumnType.RoundedNumber },
            { id: "sixSixtyFeetSpeed", isHidden: false, name: "660ft Speed", type: ColumnType.RoundedNumber },
            { id: "thousandFeetTime", isHidden: false, name: "1000ft", type: ColumnType.RoundedNumber },
            { id: "thousandFeetSpeed", isHidden: false, name: "1000ft Speed", type: ColumnType.RoundedNumber },
            { id: "finishTime", isHidden: false, name: "ET", type: ColumnType.RoundedNumber },
            { id: "finishSpeed", isHidden: false, name: "ET Speed", type: ColumnType.RoundedNumber },
            { id: "dialIn", isHidden: false, name: "Dial In", type: ColumnType.RoundedNumber },
            { id: "dialInAccuracy", isHidden: false, name: "Dial In difference", type: ColumnType.SignedNumber },
            { id: "timeDifference", isHidden: false, name: "RT+ET difference", type: ColumnType.SignedNumber }
        ];
    }

    public ngOnInit() {
        const originalFilterPredicate = this.dataSource.filterPredicate;
        const filterFunctions = [
            { type: FilterType.Event,  function: (filter: FilterData, item: RaceMessageViewModel): boolean => !!item.eventId && item.eventId.toLowerCase() == filter.value.toLowerCase() },
            { type: FilterType.Class,  function: (filter: FilterData, item: RaceMessageViewModel): boolean => !!item.raceClass && item.raceClass.toLowerCase() == filter.value.toLowerCase() },
            { type: FilterType.Lane,   function: (filter: FilterData, item: RaceMessageViewModel): boolean => !!item.lane && item.lane.toLowerCase() == filter.value.toLowerCase() },
            { type: FilterType.Race,   function: (filter: FilterData, item: RaceMessageViewModel): boolean => !!item.raceId && item.raceId.toLowerCase() == filter.value.toLowerCase() },
            { type: FilterType.Racer,  function: (filter: FilterData, item: RaceMessageViewModel): boolean => !!item.racerId && item.racerId.toLowerCase() == filter.value.toLowerCase() },
            { type: FilterType.Result, function: (filter: FilterData, item: RaceMessageViewModel): boolean => !!item.result && item.result.toLowerCase() == filter.value.toLowerCase() },
            { type: FilterType.Round,  function: (filter: FilterData, item: RaceMessageViewModel): boolean => !!item.round && item.round.toLowerCase() == filter.value.toLowerCase() },
            { type: FilterType.Any,    function: (filter: FilterData, item: RaceMessageViewModel): boolean => originalFilterPredicate(item, filter.value.toLowerCase()) },
        ];

        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;
        this.dataSource.filter = "donotremovethis";
        this.dataSource.filterPredicate = (item, filterString) => {
            if (this.filters.length == 0) {
                return true;
            }

            let whitelistFilterCount = this.filters.filter(filter => !filter.isInverse).length;
            let blacklistFilterCount = this.filters.filter(filter =>  filter.isInverse).length;

            let whitelistResult = this.filters.some(filter => !filter.isInverse && filterFunctions.some(filterFn => filterFn.type == filter.type && filterFn.function(filter, item)));
            let blacklistResult = this.filters.some(filter => filter.isInverse && filterFunctions.some(filterFn => filterFn.type == filter.type && filterFn.function(filter, item)));;

            return (whitelistFilterCount == 0 || whitelistResult) && (blacklistFilterCount == 0 || !blacklistResult);
        };

        let subscriptions = [
            this.competitionService.filteredMessages.pipe(sample(interval(500))).subscribe(() => this.invalidate()),
            this.contextMenu.menuClosed.subscribe(() => this.currentContextMenuTarget = null),

            fromEvent<MouseEvent>(document, 'click')
                .pipe(
                    filter(event => {
                        const clickTarget = event.target as HTMLElement;
                        return !!this.currentContextMenuTarget && !this.currentContextMenuTarget.contains(clickTarget);
                    })
                ).subscribe(() => this.contextMenu.closeMenu())
        ];

        this.subscription = new Subscription(() => {
            for (let sub of subscriptions) {
                sub.unsubscribe();
            }
        });
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
            this.invalidate();
        });
    }

    public invalidate() {
        let oldLength = this.dataSource.filteredData.length;

        this.dataSource.data = this.map(this.competitionService.filteredMessages.value, this.getSortFilters(this.sort));

        let newLength = this.dataSource.filteredData.length;
        let lengthDifference = newLength - oldLength;
        let message: string | null = null;

        if (lengthDifference > 0) {
            message = "Added " + lengthDifference + " results";
        } else if (lengthDifference < 0) {
            message = "Removed " + Math.abs(lengthDifference) + " results";
        }

        if (message) {
            this.pushSnackbarMessage(message);
        }
    }

    private pushSnackbarMessage(message: string): void {
        if (this.snackbarTimeout) {
            clearTimeout(this.snackbarTimeout);
            this.snackbarTimeout = null;
        }

        this.snackbarTimeout = setTimeout(() => {
            this.snackBar.open(message, "Ok", { duration: 3000, politeness: "polite" });
            this.snackbarTimeout = null;
        }, 1000);
    }

    public onContextMenu(event: MouseEvent, item: RaceMessageViewModel) {
        this.contextMenu.closeMenu();
        this.currentContextMenuTarget = event.target as HTMLElement;

        event.preventDefault();
        this.contextMenuPosition.x = event.clientX + 'px';
        this.contextMenuPosition.y = event.clientY + 'px';
        this.contextMenu.menuData = { 'item': item };
        this.contextMenu.menu.focusFirstItem('mouse');
        this.contextMenu.openMenu();
    }

    public onContextMenuIgnore(item: string, filterType: FilterType) {
        this.addFilter(item, filterType, true);
    }

    public onContextMenuAllow(item: string, filterType: FilterType) {
        this.addFilter(item, filterType, false);
    }

    public addFilterFromInput(event: MatChipInputEvent): void {
        const input = event.input;
        const value = (event.value || "").trim();

        this.addFilter(value, FilterType.Any, false);

        if (input) {
            input.value = "";
        }
    }

    public addFilter(value: string, filterType: FilterType, isInverse: boolean): void {
        if (value && filterType in FilterType) {
            this.filters.push({ value: value, type: filterType, isInverse: isInverse });
            this.invalidate();
        }
    }

    public removeFilter(filter: FilterData): void {
        const index = this.filters.indexOf(filter);

        if (index != -1) {
            this.filters.splice(index, 1);
            this.invalidate();
        }
    }

    public getFilters(isInverse: boolean): FilterData[] {
        return this.filters.filter(x => x.isInverse == isInverse);
    }

    public format(item: any, column: ColumnData): any {
        if (column.type == ColumnType.SignedNumber) {
            return new MyNumberPipe().transform(item, null);
        }

        if (column.type == ColumnType.RoundedNumber) {
            return this.decimalPipe.transform(item, "1.0-5");
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
        return this.getDisplayedColumnNames().map(x => x + "-buttons");
    }

    private getSortFilters(sort: MatSort): ((item: RaceMessageViewModel) => boolean)[] {
        let filters = new Array<((item: RaceMessageViewModel) => boolean)>();
        let raceProperties = ["reactionTime", "sixtyFeetTime", "threeThirtyFeetTime", "sixSixtyFeetTime", "sixSixtyFeetSpeed", "thousandFeetTime", "thousandFeetSpeed", "finishTime", "finishSpeed", "dialIn", "dialInAccuracy", "timeDifference"];

        if (raceProperties.includes(sort.active)) {
            if (sort.active == "reactionTime") {
                filters.push(x => x[sort.active] >= 0);
            } else {
                filters.push(x => x[sort.active] > 0);
            }

            filters.push(x => x[sort.active] < 1000);
        }

        if (sort.active != "timestamp") {
            filters.push(x => x.racerId != null && x.racerId.toUpperCase() != "BYE");
        }

        return filters;
    }

    public hideColumn(columnName: string) {
        let column = this.columns.find(x => x.id == columnName);
        if (column != undefined) {
            column.isHidden = true;
        }
    }

    private map(messages: RaceEventMessage[], filters: ((item: RaceMessageViewModel) => boolean)[]): RaceMessageViewModel[] {
        let data = new Array<RaceMessageViewModel>();

        for (const msg of messages) {
            for (const result of msg.results) {
                let item = {
                    timestamp: this.datePipe.transform(msg.timestamp, "yyyy-MM-dd HH:mm:ss")!,
                    eventId: msg.eventId,
                    eventName: msg.eventName || msg.eventId,
                    raceId: msg.raceId,
                    round: msg.round,
                    raceClass: RaceUtils.getClass(result.racerId, "GENERAL") || "INVALID",

                    dialIn: result.dialIn,
                    finishSpeed: result.finishSpeed,
                    finishTime: result.finishTime,
                    lane: result.lane ? result.lane.toUpperCase() : null,
                    racerId: result.racerId,
                    reactionTime: result.reactionTime,
                    result: new RaceResultPipe().transform(result.result),
                    sixSixtyFeetSpeed: result.sixSixtyFeetSpeed,
                    sixSixtyFeetTime: result.sixSixtyFeetTime,
                    sixtyFeetTime: result.sixtyFeetTime,
                    thousandFeetSpeed: result.thousandFeetSpeed,
                    thousandFeetTime: result.thousandFeetTime,
                    threeThirtyFeetTime: result.threeThirtyFeetTime,

                    dialInAccuracy: this.getDialInAccuracy(result, msg),
                    timeDifference: this.getTimeDifference(result, msg),
                };

                let canAdd = filters.every(x => x(item));
                if (canAdd) {
                    data.push(item);
                }
            }
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

export interface RaceMessageViewModel {
    eventId: string;
    eventName: string;
    raceId: string;
    round: string;
    timestamp: string;
    raceClass: string;

    racerId: string;
    lane: string | null;
    result: string | null;
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

export interface FilterData {
    type: FilterType;
    value: string;
    isInverse: boolean;
}

export enum FilterType {
    Unknown = 0,
    Event = 1,
    Class = 2,
    Racer = 3,
    Race = 4,
    Lane = 5,
    Result = 6,
    Round = 7,
    Any = 8
}
