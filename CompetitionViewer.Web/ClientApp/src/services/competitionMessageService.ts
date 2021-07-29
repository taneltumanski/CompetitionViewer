import { Injectable, EventEmitter } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HttpError, IHubProtocol, TransferFormat, ILogger, HubMessage, JsonHubProtocol } from '@aspnet/signalr';
import { Observable, Subject, ReplaySubject, BehaviorSubject } from 'rxjs';
import { connect } from 'tls';
import { CompetitionMessage } from '../models/racemessages';

//import { gzipSync, gunzipSync } from 'browserify-zlib';

@Injectable({
    providedIn: 'root',
})
export class CompetitionMessageService {
    private isConnectedToServer: boolean = false;
    private connection: HubConnection | undefined;
    private reconnectTimerHandle: number = 0;

    private messageStream: Subject<CompetitionMessage> = new Subject();

    public onConnected: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    public getMessageStream(): Observable<CompetitionMessage> {
        return this.messageStream.asObservable();
    }

    public requestEventUpdate(id: string) {
        this.connection?.invoke("UpdateEvent", id);
    }

    public requestAllEventUpdates() {
        this.connection?.invoke("UpdateAllEvents");
    }

    public connectSignalR() {
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
            .onclose(e => this.onSignalrError(e));

        connection
            .start()
            .then(
                () => {
                    connection
                        .on("OnCompetitionMessage", msg => this.messageStream.next(msg));

                    /* TODO start event */
                    this.isConnectedToServer = true;
                    this.onConnected.next(true);
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
            console.error('Error: ' + error);
        } else {
            console.error('Connection disconnected');
        }

        this.isConnectedToServer = false;
        this.onConnected.next(false);
        this.reconnectSignalR();
    }

    private reconnectSignalR() {
        const timeout = 5000;

        this.connection = undefined;

        clearTimeout(this.reconnectTimerHandle);

        console.log("Reconnecting in " + timeout + " ms")

        this.reconnectTimerHandle = window.setTimeout(() => this.connectSignalR(), timeout);
    }
}
