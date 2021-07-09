"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaceUtils = void 0;
var RaceUtils = /** @class */ (function () {
    function RaceUtils() {
    }
    RaceUtils.getClass = function (id, defaultClass) {
        if (id == null) {
            return null;
        }
        if (id.toUpperCase() == "RWYB") {
            return id.substr(3);
        }
        for (var i = id.length - 1; i >= 0; i--) {
            var c = id[i];
            if (!(c >= '0' && c <= '9')) {
                return id.substr(0, i + 1);
            }
        }
        return defaultClass;
    };
    RaceUtils.getStage = function (round) {
        if (round == null) {
            return round;
        }
        for (var i = round.length - 1; i >= 0; i--) {
            var c = round[i];
            if (!(c >= '0' && c <= '9')) {
                return round.substr(0, i + 1);
            }
        }
        return round;
    };
    RaceUtils.isValidRaceClass = function (raceClass) {
        if (raceClass == null) {
            return false;
        }
        if (raceClass.toUpperCase() == "BYE") {
            return false;
        }
        return true;
    };
    return RaceUtils;
}());
exports.RaceUtils = RaceUtils;
//# sourceMappingURL=raceUtils.js.map