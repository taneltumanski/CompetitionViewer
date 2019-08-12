import { Component, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HubConnectionBuilder } from '@aspnet/signalr';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html'
})
export class EventsComponent {
  constructor(http: HttpClient, @Inject('BASE_URL') baseUrl: string) {
    let connection = new HubConnectionBuilder()
      .withUrl("/results")
      .build();

    connection.on("DataReceived", data => {
      console.log(data);
    });

    connection.start().catch(reason => console.error(reason));
  }
}
