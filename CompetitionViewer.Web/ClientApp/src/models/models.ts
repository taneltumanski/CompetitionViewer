import { RaceEventMessage } from "./racemessages";
import { BehaviorSubject } from "rxjs";

export interface RaceEvent {
    id: string;
    name: string;
    results: ObservableArray<RaceEventMessage>;
    classes: ObservableArray<RaceClass>;
    participants: ObservableArray<Participant>;
}

export interface RaceClass {
    id: string;
    name: string;
    definingProperty: RaceClassDefiningProperty;
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
    FinishTime = 1,
    ReactionTime = 2
}

export class ObservableArray<T> extends BehaviorSubject<T[]> {
    public push(item: T) {
        this.value.push(item);
        this.next(this.value);
    }
}
