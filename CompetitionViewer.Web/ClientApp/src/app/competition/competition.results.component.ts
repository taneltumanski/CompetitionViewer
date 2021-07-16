import { Component, Input, OnChanges, SimpleChanges, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
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
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatMenuTrigger } from '@angular/material/menu';

@Component({
    selector: 'competition-results',
    templateUrl: './competition.results.component.html',
    styleUrls: ['./competition.component.css'],
    animations: [
        trigger('detailExpand', [
            state('collapsed', style({ height: '0px', minHeight: '0' })),
            state('expanded', style({ height: '*' })),
            transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
        ]),
    ],
})
export class CompetitionResultsComponent implements OnInit, AfterViewInit, OnDestroy {
    private subscription: Subscription | null;
    private currentContextMenuTarget: HTMLElement | null;
    private snackbarTimeout: NodeJS.Timeout | null;

    public expandedRow: RaceMessageViewModel | null;
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
            { id: "index", isHidden: false, name: "Index", type: ColumnType.Default, isRaceProperty: false },
            { id: "timestamp", isHidden: false, name: "Timestamp", type: ColumnType.Default, isRaceProperty: false },
            { id: "raceId", isHidden: false, name: "Race ID", type: ColumnType.Default, isRaceProperty: false },
            { id: "round", isHidden: false, name: "Round", type: ColumnType.Default, isRaceProperty: false },
            { id: "racerId", isHidden: false, name: "Racer ID", type: ColumnType.Default, isRaceProperty: false },
            { id: "lane", isHidden: false, name: "Lane", type: ColumnType.Default, isRaceProperty: false },
            { id: "result", isHidden: false, name: "Result", type: ColumnType.Default, isRaceProperty: false },
            { id: "reactionTime", isHidden: false, name: "RT", type: ColumnType.RoundedNumber, isRaceProperty: true },
            { id: "sixtyFeetTime", isHidden: false, name: "60ft", type: ColumnType.RoundedNumber, isRaceProperty: true },
            { id: "threeThirtyFeetTime", isHidden: false, name: "330ft", type: ColumnType.RoundedNumber, isRaceProperty: true },
            { id: "sixSixtyFeetTime", isHidden: false, name: "660ft", type: ColumnType.RoundedNumber, isRaceProperty: true },
            { id: "sixSixtyFeetSpeed", isHidden: false, name: "660ft Speed", type: ColumnType.RoundedNumber, isRaceProperty: true },
            { id: "thousandFeetTime", isHidden: true, name: "1000ft", type: ColumnType.RoundedNumber, isRaceProperty: true },
            { id: "thousandFeetSpeed", isHidden: true, name: "1000ft Speed", type: ColumnType.RoundedNumber, isRaceProperty: true },
            { id: "finishTime", isHidden: false, name: "ET", type: ColumnType.RoundedNumber, isRaceProperty: true },
            { id: "finishSpeed", isHidden: false, name: "ET Speed", type: ColumnType.RoundedNumber, isRaceProperty: true },
            { id: "total", isHidden: false, name: "RT+ET", type: ColumnType.RoundedNumber, isRaceProperty: true },
            { id: "dialIn", isHidden: false, name: "Dial In", type: ColumnType.RoundedNumber, isRaceProperty: true },
            { id: "dialInAccuracy", isHidden: false, name: "Dial In difference", type: ColumnType.SignedNumber, isRaceProperty: true },
            { id: "timeDifference", isHidden: false, name: "RT+ET difference", type: ColumnType.SignedNumber, isRaceProperty: true }
        ];
    }

    public ngOnInit() {
        const originalFilterPredicate = this.dataSource.filterPredicate;
        const filterFunctions = [
            { type: FilterType.Event, function: (filter: FilterData, item: RaceMessageViewModel): boolean => !!item.eventId && item.eventId.toLowerCase() == filter.value.toLowerCase() },
            { type: FilterType.Class, function: (filter: FilterData, item: RaceMessageViewModel): boolean => !!item.raceClass && item.raceClass.toLowerCase() == filter.value.toLowerCase() },
            { type: FilterType.Lane, function: (filter: FilterData, item: RaceMessageViewModel): boolean => !!item.lane && item.lane.toLowerCase() == filter.value.toLowerCase() },
            { type: FilterType.Race, function: (filter: FilterData, item: RaceMessageViewModel): boolean => !!item.raceId && item.raceId.toLowerCase() == filter.value.toLowerCase() },
            { type: FilterType.Racer, function: (filter: FilterData, item: RaceMessageViewModel): boolean => !!item.racerId && item.racerId.toLowerCase() == filter.value.toLowerCase() },
            { type: FilterType.Result, function: (filter: FilterData, item: RaceMessageViewModel): boolean => !!item.result && item.result.toLowerCase() == filter.value.toLowerCase() },
            { type: FilterType.Round, function: (filter: FilterData, item: RaceMessageViewModel): boolean => !!item.round && item.round.toLowerCase() == filter.value.toLowerCase() },
            { type: FilterType.Stage, function: (filter: FilterData, item: RaceMessageViewModel): boolean => !!item.stage && item.stage.toLowerCase() == filter.value.toLowerCase() },
            { type: FilterType.Any, function: (filter: FilterData, item: RaceMessageViewModel): boolean => originalFilterPredicate(item, filter.value.toLowerCase()) },
        ];

        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;
        this.dataSource.filter = "donotremovethis";
        this.dataSource.filterPredicate = (item, filterString) => {
            if (this.filters.length == 0) {
                return true;
            }

            let whitelistFilterCount = this.filters.filter(filter => !filter.isInverse).length;
            let blacklistFilterCount = this.filters.filter(filter => filter.isInverse).length;

            let whitelistResult = this.filters.some(filter => !filter.isInverse && filterFunctions.some(filterFn => filterFn.type == filter.type && filterFn.function(filter, item)));
            let blacklistResult = this.filters.some(filter => filter.isInverse && filterFunctions.some(filterFn => filterFn.type == filter.type && filterFn.function(filter, item)));;

            return (whitelistFilterCount == 0 || whitelistResult) && (blacklistFilterCount == 0 || !blacklistResult);
        };

        let subscriptions = [
            this.competitionService.filteredMessages.pipe(sample(interval(500))).subscribe(x => this.invalidate(x)),
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

    public invalidate(messages?: RaceEventMessage[]) {
        let oldLength = this.dataSource.filteredData.length;
        let messageList = messages || this.competitionService.filteredMessages.value;
        let mappedMessages = this.map(messageList, this.getSortFilters(this.sort));

        this.dataSource.data = mappedMessages;

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

    public onClick(item: RaceMessageViewModel) {
        if (this.expandedRow == item) {
            this.expandedRow = null;
        }
        else {
            this.expandedRow = item;
        }
    }

    public onContextMenuIgnore(item: string, filterType: FilterType) {
        this.addFilter(item, filterType, true);
    }

    public onContextMenuAllow(item: string, filterType: FilterType) {
        this.addFilter(item, filterType, false);
    }

    public onContextMenuHighlight(item: string, filterType: FilterType) {
        //this.addFilter(item, filterType, false);
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
            if (this.isNumber(item)) {
                let val = item as number;

                return (val > 0 ? "+" : "") + val.toFixed(5);
            }

            return null;
        }

        if (column.type == ColumnType.RoundedNumber) {
            return this.decimalPipe.transform(item, "1.0-5");
        }

        return item;
    }

    private isNumber(value: string | number): boolean {
        return (value != null) && (value !== '') && !isNaN(Number(value.toString()));
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
        let column = this.columns.find(x => x.id == sort.active);

        if (column != undefined && column.isRaceProperty) {
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
            let opponents = new Map<string, RaceMessageViewModel[]>();

            for (const result of msg.results) {
                let item = {
                    timestamp: this.datePipe.transform(msg.timestamp, "yyyy-MM-dd HH:mm:ss")!,
                    eventId: msg.eventId,
                    eventName: msg.eventName || msg.eventId,
                    raceId: msg.raceId,
                    round: msg.round,
                    stage: RaceUtils.getStage(msg.round)?.name || "DEFAULT",
                    raceClass: RaceUtils.getClass(result.racerId, "GENERAL") || "INVALID",

                    dialIn: result.dialIn,
                    finishSpeed: result.finishSpeed,
                    finishTime: result.finishTime,
                    total: RaceUtils.getTotalTime(result),
                    lane: result.lane ? result.lane.toUpperCase() : null,
                    racerId: result.racerId,
                    reactionTime: result.reactionTime,
                    result: this.getRaceResult(result.result),
                    sixSixtyFeetSpeed: result.sixSixtyFeetSpeed,
                    sixSixtyFeetTime: result.sixSixtyFeetTime,
                    sixtyFeetTime: result.sixtyFeetTime,
                    thousandFeetSpeed: result.thousandFeetSpeed,
                    thousandFeetTime: result.thousandFeetTime,
                    threeThirtyFeetTime: result.threeThirtyFeetTime,

                    dialInAccuracy: RaceUtils.getDialInAccuracy(result, msg),
                    timeDifference: RaceUtils.getTimeDifference(result, msg),

                    opponents: new Array<RaceMessageViewModel>()
                };

                let canAdd = filters.every(x => x(item));
                if (canAdd) {
                    data.push(item);
                }

                if (opponents[item.raceId] == null) {
                    opponents[item.raceId] = new Array<RaceMessageViewModel>();
                }

                for (const racer of opponents[item.raceId]) {
                    racer.opponents.push(item);
                    item.opponents.push(racer);
                }

                opponents[item.raceId].push(item);
            }
        }

        return data;
    }

    private getRaceResult(result: number | null) {
        if (result == null) {
            return "---";
        }

        return result == 0 ? "Winner" : "Runnerup";
    }
}

export interface RaceMessageViewModel {
    eventId: string;
    eventName: string;
    raceId: string;
    round: string;
    stage: string;
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
    total: number | null;
    dialInAccuracy: number | null;
    timeDifference: number | null;

    opponents: RaceMessageViewModel[];
}

export interface ColumnData {
    id: string;
    name: string;
    isHidden: boolean;
    type: ColumnType;
    isRaceProperty: boolean;
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
    Stage = 8,
    Any = 9
}
