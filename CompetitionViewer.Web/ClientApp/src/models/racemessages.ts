export interface CompetitionMessage {
    messageIndex: number;
    messages: RaceEventMessage[];
    removedMessageIds: string[];
}

export interface RaceEventMessage {
    hashcode: string;
    eventId: string;
    eventName: string;
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

export interface RaceEventDto {
    eventId: string;
    eventName: string;
    raceId: string;
    round: string;
    timestamp: number;
    results: RaceEventResultDto[];
}

export interface RaceEventResultDto {
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
