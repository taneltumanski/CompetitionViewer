export class RaceUtils {
    public static getClass(id: string): string | null {
        for (var i = id.length - 1; i >= 0; i--) {
            let c = id[i];

            if (!(c >= '0' && c <= '9')) {
                return id.substr(0, i + 1);
            }
        }

        return null;
    }

    public static isValidRaceClass(raceClass: string | null): boolean {
        if (raceClass == null) {
            return false;
        }

        if (raceClass == "BYE") {
            return false;
        }

        if (raceClass.toUpperCase().startsWith("RWYB") && raceClass.length > 4) {
            return false;
        }

        return true;
    }
}
