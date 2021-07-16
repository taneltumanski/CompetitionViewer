"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaceUtils = void 0;
var RaceUtils = /** @class */ (function () {
    function RaceUtils() {
    }
    RaceUtils.getClass = function (id, defaultClass) {
        if (id.toUpperCase().startsWith("RWYB")) {
            return id.substr(0, 4);
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
        for (var i = round.length - 1; i >= 0; i--) {
            var c = round[i];
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
    };
    RaceUtils.isValidRaceClass = function (raceClass) {
        if (raceClass == undefined) {
            return false;
        }
        if (raceClass.toUpperCase() == "BYE") {
            return false;
        }
        return true;
    };
    RaceUtils.getTotalTime = function (result) {
        if (result.reactionTime == undefined || result.finishTime == undefined || result.reactionTime < 0 || result.finishTime <= 0) {
            return undefined;
        }
        return result.reactionTime + result.finishTime;
    };
    RaceUtils.getDialInAccuracy = function (result) {
        if (result == undefined || result.finishTime == undefined) {
            return undefined;
        }
        if (result.dialIn == 0 || result.dialIn == undefined) {
            return undefined;
        }
        return result.finishTime - result.dialIn;
    };
    RaceUtils.getTimeDifference = function (result, message) {
        var winnerResult;
        if (this.isRaceEventResultMessage(message)) {
            winnerResult = message;
            ;
        }
        else {
            winnerResult = message.results.find(function (x) { return x.result == 0; });
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
            var currentResultDialInDifference = result.reactionTime + result.finishTime - result.dialIn;
            var winnerResultDialInDifference = winnerResult.reactionTime + winnerResult.finishTime - winnerResult.dialIn;
            var difference = currentResultDialInDifference - winnerResultDialInDifference;
            return difference;
        }
        else {
            var currentResultDiff = result.reactionTime + result.finishTime;
            var winnerResultDiff = winnerResult.reactionTime + winnerResult.finishTime;
            var difference = currentResultDiff - winnerResultDiff;
            return difference;
        }
    };
    RaceUtils.isRaceEventResultMessage = function (msg) {
        return msg.threeThirtyFeetTime !== undefined;
    };
    return RaceUtils;
}());
exports.RaceUtils = RaceUtils;
//# sourceMappingURL=raceUtils.js.map