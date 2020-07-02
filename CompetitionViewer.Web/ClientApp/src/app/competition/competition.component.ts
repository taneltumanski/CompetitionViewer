import { Component } from '@angular/core';
import { HubConnection, HttpError } from '@aspnet/signalr'
import { HubConnectionBuilder } from '@aspnet/signalr/dist/esm/HubConnectionBuilder';

@Component({
  selector: 'competition',
  templateUrl: './competition.component.html',
  styleUrls: ['./competition.component.css'],
})

export class CompetitionComponent {
  public raceMessages: RaceEventMessage[] = [];
  public selectedMessage: RaceEventMessage | null = null;
  public isConnectedToServer: boolean = false;

  private connection: HubConnection | null = null;
  private reconnectTimerHandle: number = 0;

  constructor() {
    this.isConnectedToServer = false;

    this.clearState();
    this.connectSignalR();
  }

  private clearState() {
    this.raceMessages = [];
    this.selectedMessage = null;
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

  private handleMessages(events: RaceEventMessage[]) {
    for (const event of events) {
      this.handleMessage(event);
    }
  }

  private handleMessage(event: RaceEventMessage) {
    event.results.sort((a, b) => a.lanePosition - b.lanePosition)

    this.raceMessages.push(event);

    this.raceMessages.sort((a, b) => b.timestamp - a.timestamp)
  }
}

export interface MessageViewModel {
  message: RaceEventMessage;
}

export interface RaceEventMessage {
  eventId: string;
  raceId: string;
  round: string;
  timestamp: number;
  results: RaceEventResult[];
}

export interface RaceEventResult {
  racerId: string;
  lanePosition: number | null;
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
