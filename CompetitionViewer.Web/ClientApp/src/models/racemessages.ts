export interface CompetitionMessage {
    messageIndex: number;
    messages: RaceEventMessage[];
}

export interface RaceEventMessage {
    eventId: string;
    eventName: string;
    raceId: string;
    round: string;
    timestamp: number;
    results: RaceEventResultMessage[];
}

export interface RaceEventResultMessage {
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
