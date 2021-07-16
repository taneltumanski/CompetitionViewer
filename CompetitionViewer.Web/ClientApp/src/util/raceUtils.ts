import { RaceEventMessage, RaceEventResultMessage } from "../models/racemessages";
import { RoundInformation } from "../services/competitionService";

export class RaceUtils {
    public static getClass(id: string, defaultClass: string): string | null {
        if (id == null) {
            return null;
        }

        if (id.toUpperCase().startsWith("RWYB")) {
            return id.substr(0, 4);
        }

        for (var i = id.length - 1; i >= 0; i--) {
            let c = id[i];

            if (!(c >= '0' && c <= '9')) {
                return id.substr(0, i + 1);
            }
        }

        return defaultClass;
    }

    public static getStage(round: string): RoundInformation | null {
        if (round == null) {
            return null;
        }

        for (var i = round.length - 1; i >= 0; i--) {
            let c = round[i];

            if (!(c >= '0' && c <= '9')) {
                return {
                    name: round.substr(0, i + 1),
                    round: Number.parseInt(round.substr(i + 1, round.length - i - 1))
                };
            }
        }

        return {
            name: round,
            round: null
        };
    }

    public static isValidRaceClass(raceClass: string | null): boolean {
        if (raceClass == null) {
            return false;
        }

        if (raceClass.toUpperCase() == "BYE") {
            return false;
        }

        return true;
    }

    public static getTotalTime(result: RaceEventResultMessage) {
        if (result.reactionTime == null || result.finishTime == null || result.reactionTime < 0 || result.finishTime <= 0) {
            return null;
        }

        return result.reactionTime + result.finishTime;
    }

    public static getDialInAccuracy(result: RaceEventResultMessage, message: RaceEventMessage): number | null {
        if (result == null || result.finishTime == null) {
            return null;
        }

        if (result.dialIn == 0 || result.dialIn == null) {
            return null;
        }

        return result.finishTime - result.dialIn;
    }

    public static getTimeDifference(result: RaceEventResultMessage, message: RaceEventMessage | RaceEventResultMessage): number | null {
        let winnerResult: RaceEventResultMessage;

        if (this.isRaceEventResultMessage(message)) {
            winnerResult = message;;
        } else {
            winnerResult = (<RaceEventMessage>message).results.find(x => x.result == 0);
        }

        if (winnerResult === null || winnerResult === undefined) {
            return null;
        };

        if (winnerResult == undefined || result == undefined || winnerResult.racerId == result.racerId || winnerResult.racerId.toLowerCase() == "bye" || result.racerId.toLowerCase() == "bye") {
            return null;
        }

        if (result.finishTime == 0) {
            return null;
        }

        if (result.reactionTime == null || result.finishTime == null || winnerResult.reactionTime == null || winnerResult.finishTime == null) {
            return null;
        }

        if (result.dialIn != null && winnerResult.dialIn != null && result.dialIn > 0 && winnerResult.dialIn > 0) {
            let currentResultDialInDifference = result.reactionTime + result.finishTime - result.dialIn;
            let winnerResultDialInDifference = winnerResult.reactionTime + winnerResult.finishTime - winnerResult.dialIn;
            let difference = currentResultDialInDifference - winnerResultDialInDifference;

            return difference;
        } else {
            let currentResultDiff = result.reactionTime + result.finishTime;
            let winnerResultDiff = winnerResult.reactionTime + winnerResult.finishTime;
            let difference = currentResultDiff - winnerResultDiff;

            return difference;
        }
    }

    private static isRaceEventResultMessage(msg: RaceEventMessage | RaceEventResultMessage): msg is RaceEventResultMessage { //magic happens here
        return (<RaceEventResultMessage>msg).threeThirtyFeetTime !== undefined;
    }
}
