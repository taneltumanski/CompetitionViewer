import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HttpError } from '@aspnet/signalr';
import { Observable, Subject, ReplaySubject } from 'rxjs';
import { RaceEventMessage } from '../models/racemessages';

@Injectable({
    providedIn: 'root',
})
export class CompetitionMessageService {
    private isConnectedToServer: boolean = false;
    private connection: HubConnection | null = null;
    private reconnectTimerHandle: number = 0;

    private messageStream: ReplaySubject<RaceEventMessage[]> = new ReplaySubject();

    constructor() {
        this.connectSignalR();
    }

    public getMessageStream(): Observable<RaceEventMessage[]> {
        return this.messageStream.asObservable();
    }

    private connectSignalR() {
        if (this.connection) {
            this.connection.stop();
        }

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
            .then(() => { /* TODO stop event */ })
            .then(
                () => {
                    connection
                        .on("SendMessages", messages => this.messageStream.next(messages));

                    /* TODO start event */
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

        /* TODO stop event */
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
}
