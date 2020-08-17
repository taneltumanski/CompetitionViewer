"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var RaceUtils = /** @class */ (function () {
    function RaceUtils() {
    }
    RaceUtils.getClass = function (id, defaultClass) {
        if (id == null) {
            return null;
        }
        for (var i = id.length - 1; i >= 0; i--) {
            var c = id[i];
            if (!(c >= '0' && c <= '9')) {
                return id.substr(0, i + 1);
            }
        }
        return defaultClass;
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