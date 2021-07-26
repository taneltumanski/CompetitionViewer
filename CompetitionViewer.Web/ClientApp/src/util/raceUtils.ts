import { RaceEventRace, RaceEventRaceResult } from "../models/racemessages";
import { RoundInformation } from "../services/competitionService";

export class RaceUtils {
    public static getClass(id: string | undefined, defaultClass: string): string | undefined {
        if (id == undefined || id.length == 0) {
            return undefined;
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

    public static getStage(round: string): RoundInformation | undefined {
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
            round: undefined
        };
    }

    public static isValidRaceClass(raceClass: string | undefined): boolean {
        if (raceClass == undefined) {
            return false;
        }

        if (raceClass.toUpperCase() == "BYE") {
            return false;
        }

        return true;
    }

    public static getTotalTime(result: RaceEventRaceResult) {
        if (result.reactionTime == undefined || result.finishTime == undefined || result.reactionTime < 0 || result.finishTime <= 0) {
            return undefined;
        }

        return result.reactionTime + result.finishTime;
    }

    public static getDialInAccuracy(result: RaceEventRaceResult): number | undefined {
        if (result == undefined || result.finishTime == undefined) {
            return undefined;
        }

        if (result.dialIn == 0 || result.dialIn == undefined) {
            return undefined;
        }

        return result.finishTime - result.dialIn;
    }

    public static getTimeDifference(result: RaceEventRaceResult, message: RaceEventRace | RaceEventRaceResult): number | undefined {
        let winnerResult: RaceEventRaceResult | undefined;

        if (this.isRaceEventResultMessage(message)) {
            winnerResult = message;;
        } else {
            winnerResult = (<RaceEventRace>message).results.find(x => x.result == 0);
        }

        if (winnerResult == undefined || result == undefined || winnerResult.racerId == result.racerId || winnerResult.racerId.toLowerCase() == "bye" || result.racerId.toLowerCase() == "bye") {
            return undefined;
        }

        if (result.finishTime == 0) {
            return undefined;
        }

        if (result.reactionTime == undefined || result.finishTime == undefined || winnerResult.reactionTime == undefined || winnerResult.finishTime == undefined) {
            return undefined;
        }

        if (result.dialIn != undefined && winnerResult.dialIn != undefined && result.dialIn > 0 && winnerResult.dialIn > 0) {
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

    private static isRaceEventResultMessage(msg: RaceEventRace | RaceEventRaceResult): msg is RaceEventRaceResult {
        return (<RaceEventRaceResult>msg).threeThirtyFeetTime !== undefined;
    }
}
