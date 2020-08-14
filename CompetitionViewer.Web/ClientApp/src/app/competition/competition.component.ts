import { Component, OnChanges, SimpleChanges, OnInit, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { HubConnection, HttpError } from '@aspnet/signalr'
import { HubConnectionBuilder } from '@aspnet/signalr/dist/esm/HubConnectionBuilder';
import { fromEvent, Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { TemplatePortal } from '@angular/cdk/portal';
import { OverlayRef, Overlay } from '@angular/cdk/overlay';

@Component({
    selector: 'competition',
    templateUrl: './competition.component.html',
    styleUrls: ['./competition.component.css'],
})
export class CompetitionComponent {
    @ViewChild('classMenu', { read: false, static: false }) classMenu: TemplateRef<any>;
    overlayRef: OverlayRef | null;
    sub: Subscription;

    private raceMessages: RaceEventModel[] = [];

    public filteredMessages: RaceEventModel[] = [];
    public eventList: EventModel[] = [];
    public selectedMessage: RaceEventModel | null = null;
    public selectedEvent: EventModel | null = null;
    public isConnectedToServer: boolean = false;

    public qualificationViewModel: QualificationViewModel = new QualificationViewModel();

    private hasEventBeenSelected: boolean = false;
    private connection: HubConnection | null = null;
    private reconnectTimerHandle: number = 0;

    constructor(
        public overlay: Overlay,
        public viewContainerRef: ViewContainerRef) {
        this.isConnectedToServer = false;

        this.clearState();
        this.connectSignalR();
    }

    openContextMenu({ x, y }: MouseEvent, obj: any) {
        this.closeContextMenu();
        const positionStrategy = this.overlay.position()
            .flexibleConnectedTo({ x, y })
            .withPositions([
                {
                    originX: 'end',
                    originY: 'bottom',
                    overlayX: 'end',
                    overlayY: 'top',
                }
            ]);

        this.overlayRef = this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.close()
        });

        this.overlayRef.attach(new TemplatePortal(this.classMenu, this.viewContainerRef, {
            $implicit: obj
        }));

        this.sub = fromEvent<MouseEvent>(document, 'click')
            .pipe(
                filter(event => {
                    const clickTarget = event.target as HTMLElement;
                    return !!this.overlayRef && !this.overlayRef.overlayElement.contains(clickTarget);
                }),
                take(1)
            ).subscribe(() => this.closeContextMenu())
    }

    closeContextMenu() {
        this.sub && this.sub.unsubscribe();

        if (this.overlayRef) {
            this.overlayRef.dispose();
            this.overlayRef = null;
        }
    }

    onSelectedEventChange() {
        this.hasEventBeenSelected = true;
        this.updateUI();
    }

    private clearState() {
        this.raceMessages = [];
        this.selectedMessage = null;
        this.selectedEvent = null;

        this.updateUI();
    }

    private connectSignalR() {
        this.connection = new HubConnectionBuilder()
            .withUrl("/messaging")
            .build();

        this.setupEvents(this.connection);
    }

    private setupEvents(connection: HubConnection) {
        connection
            .onclose(e => {
                this.onSignalrError(e);
            });

        connection
            .start()
            .then(() => this.clearState())
            .then(
                () => {
                    connection
                        .on("SendMessages", messages => this.handleMessages(messages));

                    this.isConnectedToServer = true;
                },
                reason => this.onSignalrError(reason))
            .catch(err => this.onSignalrError(err));
    }

    private onSignalrError(error: any) {
        if (error instanceof HttpError) {
            console.error("SignalR closed with error: " + error.name + " " + error.statusCode + " " + error.message);

            // Reload the page when unauthorized
            if (error.statusCode === 401) {
                window.location.reload();
            }
        } else if (error instanceof Error) {
            console.error('Connection closed with error: ' + error.name + " " + error.message);
        } else if (error) {
            console.error(error);
        } else {
            console.error('Connection disconnected');
        }

        this.isConnectedToServer = false;
        this.reconnectSignalR();
    }

    private reconnectSignalR() {
        const timeout = 5000;

        this.connection = null;

        clearTimeout(this.reconnectTimerHandle);

        console.log("Reconnecting in " + timeout + " ms")

        this.reconnectTimerHandle = window.setTimeout(() => this.connectSignalR(), timeout);
    }

    private handleMessages(events: RaceEventModel[]) {
        for (const event of events) {
            this.handleMessage(event);
        }

        this.updateUI();
    }

    private handleMessage(event: RaceEventModel) {
        event.results.sort((a, b) => a.lane.localeCompare(b.lane));

        this.raceMessages.push(event);

        let existingEvent = this.eventList.find(x => x.eventId == event.eventId);
        if (existingEvent == undefined) {
            existingEvent = {
                eventId: event.eventId,
                eventName: event.eventName || event.eventId,
                classes: [],
                results: []
            };

            this.eventList.push(existingEvent);
        }

        existingEvent.results.push(event);

        for (const result of event.results) {
            let racerId = result.racerId;
            let raceClass = RaceUtils.getClass(racerId);

            if (raceClass == null) {
                raceClass = "GENERAL";
            }

            if (!RaceUtils.isValidRaceClass(raceClass)) {
                continue;
            }

            let existingEventClass = existingEvent.classes.find(x => x.classId == raceClass);
            if (existingEventClass == undefined) {
                existingEventClass = {
                    classId: raceClass,
                    className: raceClass,
                    participants: [],
                    results: []
                };

                existingEvent.classes.push(existingEventClass);
            }

            existingEventClass.results.push(event);

            let existingParticipant = existingEventClass.participants.find(x => x == racerId);
            if (existingParticipant == undefined) {
                existingEventClass.participants.push(racerId);
            }
        }
    }

    private updateUI() {
        this.filteredMessages = this.filterMessages(this.raceMessages).sort((a, b) => b.timestamp - a.timestamp);

        if (!this.hasEventBeenSelected && this.eventList.length > 0) {
            this.selectedEvent = this.eventList[this.eventList.length - 1];
        }

        if (this.selectedEvent != null) {
            this.qualificationViewModel.invalidate(this.selectedEvent.results);
        }
    }

    private filterMessages(messages: RaceEventModel[]): RaceEventModel[] {
        let filteredMessages = messages;

        if (this.selectedEvent != null) {
            filteredMessages = filteredMessages.filter(x => x.eventId == this.selectedEvent.eventId);
        }

        for (var i = 0; i < filteredMessages.length; i++) {
            for (var j = 0; j < filteredMessages[i].results.length; j++) {
                let result = filteredMessages[i].results[j];
                let raceClass = RaceUtils.getClass(result.racerId);

                if (raceClass != null && raceClass.toUpperCase().startsWith("RWYB") && raceClass.length > 4) {
                    filteredMessages[i].results.splice(j, 1);
                    j--;
                }
            }

            if (filteredMessages[i].results.length == 0) {
                filteredMessages.splice(i, 1);
                i--;
            }
        }

        return filteredMessages;
    }

    public getParticipantCount(event: EventModel): number {
        return event.classes.reduce((acc, val) => acc + val.participants.length, 0);
    }
}

export interface RaceEventModel {
    eventId: string;
    eventName: string;
    raceId: string;
    round: string;
    timestamp: number;
    results: RaceEventResultModel[];
}

export interface RaceEventResultModel {
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
}

export interface EventModel {
    eventId: string;
    eventName: string;
    classes: ClassModel[];
    results: RaceEventModel[];
}

export interface ClassModel {
    classId: string;
    className: string;
    participants: string[];
    results: RaceEventModel[];
}

export class QualificationViewModel {
    public ignoredClasses: string[] = [];
    public ignoredRacers: string[] = [];
    public ignoredRaces: string[] = [];

    public classViewModels: QualificationClassViewModel[] = [];

    public updateWithMessage(message: RaceEventModel) {
        for (let result of message.results) {
            this.update(result, message);
        }
    }

    public update(result: RaceEventResultModel, message: RaceEventModel) {
        let raceClass = RaceUtils.getClass(result.racerId);

        if (!RaceUtils.isValidRaceClass(raceClass)) {
            return;
        }

        if (this.ignoredClasses.includes(raceClass)) {
            return;
        }

        if (this.ignoredRacers.includes(result.racerId)) {
            return;
        }

        if (!message.round.startsWith("Q")) {
            return;
        }

        let existingClassVM = this.classViewModels.find(x => x.id == raceClass);
        if (existingClassVM == undefined) {
            let prop = ["BB", "SET", "PET", "J/BR",].includes(raceClass) ? RaceClassDefiningProperty.ReactionTime : RaceClassDefiningProperty.FinishTime;
            existingClassVM = new QualificationClassViewModel(raceClass, raceClass, prop);

            this.classViewModels.push(existingClassVM);
        }

        existingClassVM.update(result);
    }

    public invalidate(messages: RaceEventModel[]) {
        this.classViewModels = [];

        for (let message of messages) {
            this.updateWithMessage(message);
        }
    }

    public ignoreRaceClass(raceClass: string) {
        if (!this.ignoredClasses.includes(raceClass)) {
            this.ignoredClasses.push(raceClass);
        }

        for (let i = 0; i < this.ignoredClasses.length; i++) {
            let index = this.classViewModels.findIndex(x => x.id == this.ignoredClasses[i]);
            if (index != -1) {
                this.classViewModels.splice(index, 1);
            }
        }
    }

    public ignoreRacer(racerId: string) {
        if (!this.ignoredRacers.includes(racerId)) {
            this.ignoredRacers.push(racerId);
        }
    }
}

export class QualificationClassViewModel {
    public participantPositions: QualificationPosition[] = [];

    constructor(
        public id: string,
        public name: string,
        public definingProperty: RaceClassDefiningProperty
    ) {
    }

    public update(result: RaceEventResultModel) {
        let propertyTime = this.definingProperty == RaceClassDefiningProperty.FinishTime ? result.finishTime : result.reactionTime;
        let existingItemIndex = this.participantPositions.findIndex(x => x.participant == result.racerId);

        if (existingItemIndex == -1) {
            if (this.definingProperty == RaceClassDefiningProperty.FinishTime && propertyTime > 0) {
                this.participantPositions.push({
                    participant: result.racerId,
                    bestTime: propertyTime
                });
            } else if (this.definingProperty == RaceClassDefiningProperty.ReactionTime && propertyTime >= 0) {
                this.participantPositions.push({
                    participant: result.racerId,
                    bestTime: propertyTime
                });
            }
        } else if (propertyTime < this.participantPositions[existingItemIndex].bestTime) {
            this.participantPositions.splice(existingItemIndex, 1);

            if (this.definingProperty == RaceClassDefiningProperty.FinishTime && propertyTime > 0) {
                this.participantPositions.push({
                    participant: result.racerId,
                    bestTime: propertyTime
                });
            } else if (this.definingProperty == RaceClassDefiningProperty.ReactionTime && propertyTime >= 0) {
                this.participantPositions.push({
                    participant: result.racerId,
                    bestTime: propertyTime
                });
            }
        }

        this.participantPositions.sort((a, b) => a.bestTime - b.bestTime);
    }
}

export class RaceUtils {
    public static getClass(id: string): string | null {
        for (var i = id.length - 1; i >= 0; i--) {
            let c = id[i];

            if (!(c >= '0' && c <= '9')) {
                return id.substr(0, i + 1);
            }
        }

        return null;
    }

    public static isValidRaceClass(raceClass: string | null): boolean {
        if (raceClass == null) {
            return false;
        }

        if (raceClass == "BYE") {
            return false;
        }

        if (raceClass.toUpperCase().startsWith("RWYB") && raceClass.length > 4) {
            return false;
        }

        return true;
    }
}

export enum RaceClassDefiningProperty {
    Invalid = 0,
    FinishTime = 1,
    ReactionTime = 2
}

export interface QualificationPosition {
    participant: string;
    bestTime: number;
}
