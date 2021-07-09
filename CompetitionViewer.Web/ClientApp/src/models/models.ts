import { RaceEventMessage } from "./racemessages";
import { BehaviorSubject } from "rxjs";
import { EventInformation } from "../services/competitionService";

export interface RaceEvent {
    id: string;
    name: string;
    eventInfo: EventInformation;
    results: ObservableArray<RaceEventMessage>;
    classes: ObservableArray<RaceClass>;
    participants: ObservableArray<Participant>;
}

export interface RaceClass {
    id: string;
    name: string;
    qualificationDefiningProperty: RaceClassDefiningProperty;
    raceEndDefiningProperty: RaceEndDefiningProperty;
    results: ObservableArray<RaceEventMessage>;
    participants: ObservableArray<ClassParticipant>;
}

export interface ClassParticipant {
    participantId: string;
    participant: Participant | null;
}

export interface Participant {
    name: string;
    identificationCodes: ObservableArray<string>;
    classes: ObservableArray<RaceClass>;
    results: ObservableArray<RaceEventMessage>;
}

export enum RaceClassDefiningProperty {
    Invalid = 0,
    QuarterMileTime = 1,
    EightMileTime = 2,
    ReactionTime = 3
}

export enum RaceEndDefiningProperty {
    Invalid = 0,
    QuarterMileTime = 1,
    EightMileTime = 2
}

export class ObservableArray<T> extends BehaviorSubject<T[]> {
    public push(item: T) {
        this.value.push(item);
        this.next(this.value);
    }

    public clear() {
        this.value.splice(0, this.value.length);
        this.next(this.value);
    }
}
