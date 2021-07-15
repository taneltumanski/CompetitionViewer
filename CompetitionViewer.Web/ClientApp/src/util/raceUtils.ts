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
}
