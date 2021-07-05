export class RaceUtils {
    public static getClass(id: string, defaultClass: string): string | null {
        if (id == null) {
            return null;
        }

        for (var i = id.length - 1; i >= 0; i--) {
            let c = id[i];

            if (!(c >= '0' && c <= '9')) {
                return id.substr(0, i + 1);
            }
        }

        return defaultClass;
    }

    public static getStage(round: string): string {
        if (round == null) {
            return round;
        }

        for (var i = round.length - 1; i >= 0; i--) {
            let c = round[i];

            if (!(c >= '0' && c <= '9')) {
                return round.substr(0, i + 1);
            }
        }

        return round;
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
