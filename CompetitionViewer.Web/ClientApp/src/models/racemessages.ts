import { RaceEvent } from "./models";

export interface CompetitionMessage {
    messages: RaceEventDataMessage[];
    removedMessageIds: string[];
}

export interface RaceEventMessage {
    id: string;
    name: string;
}

export interface RaceEventDataMessage {
    hashcode: string;
    eventId: string;
    raceId: string;
    round: string;
    timestamp: number;
    racerId: string;
    lane: string | undefined;
    result: number | undefined;
    dialIn: number | undefined;
    reactionTime: number | undefined;
    sixtyFeetTime: number | undefined;
    threeThirtyFeetTime: number | undefined;
    sixSixtyFeetTime: number | undefined;
    sixSixtyFeetSpeed: number | undefined;
    thousandFeetTime: number | undefined;
    thousandFeetSpeed: number | undefined;
    finishTime: number | undefined;
    finishSpeed: number | undefined;
}

export interface RaceEventRace {
    event: RaceEvent;
    raceId: string;
    round: string;
    timestamp: number;
    results: RaceEventRaceResult[];
}

export interface RaceEventRaceResult {
    race: RaceEventRace;
    messageId: string;
    racerId: string;
    lane: string | undefined;
    result: number | undefined;
    dialIn: number | undefined;
    reactionTime: number | undefined;
    sixtyFeetTime: number | undefined;
    threeThirtyFeetTime: number | undefined;
    sixSixtyFeetTime: number | undefined;
    sixSixtyFeetSpeed: number | undefined;
    thousandFeetTime: number | undefined;
    thousandFeetSpeed: number | undefined;
    finishTime: number | undefined;
    finishSpeed: number | undefined;
}
