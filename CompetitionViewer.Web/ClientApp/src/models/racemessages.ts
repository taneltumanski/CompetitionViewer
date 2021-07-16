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
