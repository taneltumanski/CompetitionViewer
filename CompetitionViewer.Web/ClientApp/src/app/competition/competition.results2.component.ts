import { Component, Input, OnChanges, SimpleChanges, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { RaceEvent } from '../../models/models';
import { RaceEventMessage } from '../../models/racemessages';
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

@Component({
    selector: 'competition-results2',
    templateUrl: './competition.results2.component.html',
})
export class CompetitionResults2Component implements OnChanges, OnInit, AfterViewInit {
    @Input() public selectedEvent: RaceEvent | null = null;

    private dataSource = new MatTableDataSource([]);

    public ngOnChanges(changes: SimpleChanges): void {
        if (this.dataSource) {
            //this.dataSource.eventChanged(this.selectedEvent);
            this.dataSource.data = this.selectedEvent.results.value;
        }
    }

    displayedColumns = ["timestamp", "raceId"];
    asc = true;

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    @ViewChild('input') input: ElementRef;

    constructor(private route: ActivatedRoute) {
    }

    public onButton() {
        if (this.asc) {
            this.displayedColumns.sort((a, b) => a.localeCompare(b));
            this.asc = false;
        } else {
            this.displayedColumns.sort((a, b) => b.localeCompare(a));
            this.asc = true;
        }
    }

    ngOnInit() {
        //this.dataSource = new RaceMessagesDataSource();
        //this.dataSource.eventChanged(this.selectedEvent);
        this.dataSource.data = this.selectedEvent.results.value;
    }

    ngAfterViewInit() {
        this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);
        //fromEvent(this.input.nativeElement, 'keyup')
        //    .pipe(
        //        debounceTime(150),
        //        distinctUntilChanged(),
        //        tap(() => {
        //            this.paginator.pageIndex = 0;

        //            //this.loadLessonsPage();
        //        })
        //    )
        //    .subscribe();

        //merge(this.sort.sortChange, this.paginator.page)
        //    .pipe(
        //        tap(() => { })
        //    )
        //    .subscribe();

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
            err => {},
            () => this.messagesSubject.next([]));
    }
}
