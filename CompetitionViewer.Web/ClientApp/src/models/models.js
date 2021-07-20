"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservableArray = exports.EliminatorType = exports.RaceEndDefiningProperty = exports.RaceClassDefiningProperty = exports.RaceDataModel = void 0;
var rxjs_1 = require("rxjs");
var raceUtils_1 = require("../util/raceUtils");
var RaceDataModel = /** @class */ (function () {
    function RaceDataModel() {
        this.events = new Array();
    }
    RaceDataModel.prototype.clear = function () {
        this.events = [];
    };
    RaceDataModel.prototype.remove = function (messageId) {
        var foundMessage = false;
        for (var eventIndex = 0; eventIndex < this.events.length; eventIndex++) {
            var event_1 = this.events[eventIndex];
            for (var raceIndex = 0; raceIndex < event_1.races.length; raceIndex++) {
                var race = event_1.races[raceIndex];
                for (var resultIndex = 0; resultIndex < race.results.length; resultIndex++) {
                    var result = race.results[resultIndex];
                    if (result.messageId == messageId) {
                        foundMessage = true;
                        race.results.splice(resultIndex, 1);
                        break;
                    }
                }
                if (race.results.length == 0) {
                    event_1.races.splice(raceIndex, 1);
                }
                if (foundMessage) {
                    break;
                }
            }
            if (event_1.races.length == 0) {
                this.events.splice(eventIndex, 1);
            }
            if (foundMessage) {
                break;
            }
        }
    };
    RaceDataModel.prototype.update = function (message) {
        var year = new Date(message.timestamp).getFullYear();
        var existingEvent = this.getOrAddEvent(message.eventId, message.eventName);
        var raceClass = raceUtils_1.RaceUtils.getClass(message.racerId, existingEvent.eventInfo.generalClassName);
        if (raceClass == undefined || !raceUtils_1.RaceUtils.isValidRaceClass(raceClass)) {
            return;
        }
        var existingRace = existingEvent.races.find(function (x) { return x.raceId == message.raceId; });
        if (existingRace == undefined) {
            existingRace = {
                eventId: message.eventId,
                eventName: message.eventName,
                raceId: message.raceId,
                round: message.round,
                timestamp: message.timestamp,
                results: []
            };
            existingEvent.races.push(existingRace);
        }
        var existingResult = existingRace.results.find(function (x) { return x.racerId == message.racerId; });
        if (existingResult == undefined) {
            existingResult = {
                messageId: message.hashcode,
                racerId: message.racerId,
                lane: message.lane,
                result: message.result,
                dialIn: message.dialIn,
                reactionTime: message.reactionTime,
                sixtyFeetTime: message.sixtyFeetTime,
                threeThirtyFeetTime: message.threeThirtyFeetTime,
                sixSixtyFeetTime: message.sixSixtyFeetTime,
                sixSixtyFeetSpeed: message.sixSixtyFeetSpeed,
                thousandFeetTime: message.thousandFeetTime,
                thousandFeetSpeed: message.thousandFeetSpeed,
                finishTime: message.finishTime,
                finishSpeed: message.finishSpeed
            };
            existingRace.results.push(existingResult);
        }
        var classInfo = existingEvent.eventInfo.classInformations.find(function (x) { return x.id == raceClass; }) || this.getDefaultClassInfo(raceClass, year);
        var existingEventClass = existingEvent.classes.find(function (x) { return x.id == raceClass; });
        if (existingEventClass == undefined) {
            existingEventClass = {
                id: raceClass,
                name: raceClass,
                classIndex: classInfo.index,
                results: new Array(),
                qualificationDefiningProperty: classInfo.qualificationDefiningProperty,
                raceEndDefiningProperty: classInfo.raceEndDefiningProperty,
                eliminatorType: classInfo.eliminatorType,
                participants: new Array(),
            };
            existingEvent.classes.push(existingEventClass);
        }
        existingEventClass.results.push(existingRace);
        var existingParticipant = existingEventClass.participants.find(function (x) { return x.participantId == existingResult.racerId; });
        if (existingParticipant == undefined) {
            existingEventClass.participants.push({ participant: undefined, participantId: existingResult.racerId });
        }
    };
    RaceDataModel.prototype.getOrAddEvent = function (id, name) {
        var eventInfo = this.getDefaultEventInfo(id, name);
        var existingEvent = this.events.find(function (x) { return x.id == id; });
        if (existingEvent == undefined) {
            existingEvent = {
                id: eventInfo.id,
                name: eventInfo.name,
                eventInfo: eventInfo,
                classes: new Array(),
                races: new Array(),
                participants: new Array(),
            };
            this.events.push(existingEvent);
        }
        return existingEvent;
    };
    RaceDataModel.prototype.getDefaultEventInfo = function (id, name) {
        return {
            id: id,
            name: name !== null && name !== void 0 ? name : "Unknown event: " + id,
            generalClassName: "Default class",
            classInformations: [],
            qualifyingStageKey: "Q",
            eliminatorStageKey: "E"
        };
    };
    RaceDataModel.prototype.getDefaultClassInfo = function (raceClass, year) {
        var qualificationProp = ["BB", "J/BR", "ST",].includes(raceClass) ? RaceClassDefiningProperty.ReactionTime : ["SET", "PET", "SPET"].includes(raceClass) ? RaceClassDefiningProperty.DialInMargin : RaceClassDefiningProperty.QuarterMileTime;
        var raceEndProp = ["J/BR"].includes(raceClass) ? RaceEndDefiningProperty.EightMileTime : RaceEndDefiningProperty.QuarterMileTime;
        var eliminatorType = ["OL", "PB"].includes(raceClass) ? EliminatorType.Pro : EliminatorType.Sportsman;
        var classIndex = this.getClassIndex(raceClass, year);
        return {
            id: raceClass,
            name: raceClass,
            index: classIndex,
            qualificationDefiningProperty: qualificationProp,
            raceEndDefiningProperty: raceEndProp,
            eliminatorType: eliminatorType
        };
    };
    RaceDataModel.prototype.getClassIndex = function (raceClass, year) {
        if (year == 2021) {
            if (raceClass.toLocaleUpperCase() == "ST") {
                return {
                    EightMileIndex: 8.88,
                    QuarterMileIndex: 13.9
                };
            }
            if (raceClass.toLocaleUpperCase() == "ST/A") {
                return {
                    EightMileIndex: 8.23,
                    QuarterMileIndex: 12.9
                };
            }
            if (raceClass.toLocaleUpperCase() == "ST/B") {
                return {
                    EightMileIndex: 7.6,
                    QuarterMileIndex: 11.9
                };
            }
            if (raceClass.toLocaleUpperCase() == "SST") {
                return {
                    EightMileIndex: 7.04,
                    QuarterMileIndex: 10.9
                };
            }
            if (raceClass.toLocaleUpperCase() == "OL") {
                return {
                    EightMileIndex: 4.5,
                    QuarterMileIndex: 7.5
                };
            }
        }
        if (raceClass.toLocaleUpperCase() == "ST") {
            return {
                EightMileIndex: 8.88,
                QuarterMileIndex: 13.9
            };
        }
        if (raceClass.toLocaleUpperCase() == "ST/A") {
            return {
                EightMileIndex: 8.23,
                QuarterMileIndex: 12.9
            };
        }
        if (raceClass.toLocaleUpperCase() == "ST/B") {
            return {
                EightMileIndex: 7.6,
                QuarterMileIndex: 11.9
            };
        }
        if (raceClass.toLocaleUpperCase() == "SST") {
            return {
                EightMileIndex: 7.04,
                QuarterMileIndex: 10.9
            };
        }
        if (raceClass.toLocaleUpperCase() == "OL") {
            return {
                EightMileIndex: 4.5,
                QuarterMileIndex: 7.5
            };
        }
        return undefined;
    };
    RaceDataModel.prototype.isValidEvent = function (message) {
        return message.raceId
            && message.timestamp > 0
            && message.results.length > 0
            && message.results.every(function (x) {
                return x.result != undefined && x.result >= 0;
            });
    };
    return RaceDataModel;
}());
exports.RaceDataModel = RaceDataModel;
var RaceClassDefiningProperty;
(function (RaceClassDefiningProperty) {
    RaceClassDefiningProperty[RaceClassDefiningProperty["Invalid"] = 0] = "Invalid";
    RaceClassDefiningProperty[RaceClassDefiningProperty["QuarterMileTime"] = 1] = "QuarterMileTime";
    RaceClassDefiningProperty[RaceClassDefiningProperty["EightMileTime"] = 2] = "EightMileTime";
    RaceClassDefiningProperty[RaceClassDefiningProperty["ReactionTime"] = 3] = "ReactionTime";
    RaceClassDefiningProperty[RaceClassDefiningProperty["DialInMargin"] = 4] = "DialInMargin";
})(RaceClassDefiningProperty = exports.RaceClassDefiningProperty || (exports.RaceClassDefiningProperty = {}));
var RaceEndDefiningProperty;
(function (RaceEndDefiningProperty) {
    RaceEndDefiningProperty[RaceEndDefiningProperty["Invalid"] = 0] = "Invalid";
    RaceEndDefiningProperty[RaceEndDefiningProperty["QuarterMileTime"] = 1] = "QuarterMileTime";
    RaceEndDefiningProperty[RaceEndDefiningProperty["EightMileTime"] = 2] = "EightMileTime";
})(RaceEndDefiningProperty = exports.RaceEndDefiningProperty || (exports.RaceEndDefiningProperty = {}));
var EliminatorType;
(function (EliminatorType) {
    EliminatorType[EliminatorType["Invalid"] = 0] = "Invalid";
    EliminatorType[EliminatorType["Sportsman"] = 1] = "Sportsman";
    EliminatorType[EliminatorType["Pro"] = 2] = "Pro";
})(EliminatorType = exports.EliminatorType || (exports.EliminatorType = {}));
var ObservableArray = /** @class */ (function (_super) {
    __extends(ObservableArray, _super);
    function ObservableArray() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ObservableArray.prototype.push = function (item) {
        this.value.push(item);
        this.next(this.value);
    };
    ObservableArray.prototype.pushItems = function (items) {
        for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
            var item = items_1[_i];
            this.value.push(item);
        }
        this.next(this.value);
    };
    ObservableArray.prototype.clear = function () {
        this.value.splice(0, this.value.length);
        this.next(this.value);
    };
    return ObservableArray;
}(rxjs_1.BehaviorSubject));
exports.ObservableArray = ObservableArray;
//# sourceMappingURL=models.js.map