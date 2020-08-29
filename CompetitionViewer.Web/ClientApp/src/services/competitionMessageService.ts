import { Injectable, EventEmitter } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HttpError, IHubProtocol, TransferFormat, ILogger, HubMessage, JsonHubProtocol } from '@aspnet/signalr';
import { Observable, Subject, ReplaySubject, BehaviorSubject } from 'rxjs';
import { RaceEventMessage } from '../models/racemessages';

//import { gzipSync, gunzipSync } from 'browserify-zlib';

@Injectable({
    providedIn: 'root',
})
export class CompetitionMessageService {
    private isConnectedToServer: boolean = false;
    private connection: HubConnection | null = null;
    private reconnectTimerHandle: number = 0;

    private messageStream: ReplaySubject<RaceEventMessage[]> = new ReplaySubject();

    public onConnected: BehaviorSubject<boolean> = new BehaviorSubject(false);

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
            //.withHubProtocol(new CompressedJsonProtocol())
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
                        .on("RaceMessages", messages => this.messageStream.next(messages));

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
            console.error(error);
        } else {
            console.error('Connection disconnected');
        }

        /* TODO stop event */
        this.isConnectedToServer = false;
        this.onConnected.next(false);
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

//export class CompressedJsonProtocol implements IHubProtocol {
//    public name: string = "compressedJson";
//    public transferFormat: TransferFormat = TransferFormat.Binary;
//    public get version(): number { return this.jsonProtocol.version; };

//    private jsonProtocol = new JsonHubProtocol();

//    public parseMessages(input: string | ArrayBuffer | Buffer, logger: ILogger): HubMessage[] {
//        const decompressedMessageData = gunzipSync(input);
//        const decompressedMessage = decompressedMessageData.toString("utf8");

//        return this.jsonProtocol.parseMessages(decompressedMessage, logger);
//    }

//    public writeMessage(message: HubMessage): string | ArrayBuffer {
//        console.log(gunzipSync);
//        console.log(gzipSync);
//        const jsonResult = this.jsonProtocol.writeMessage(message);
//        const compressedMessage = gzipSync(jsonResult, { level: 9 });

//        return compressedMessage;
//    }
//}
