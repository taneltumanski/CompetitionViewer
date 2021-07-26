"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservableArray = exports.EliminatorType = exports.RaceEndDefiningProperty = exports.RaceQualificationDefiningProperty = exports.RaceDataModel = void 0;
var rxjs_1 = require("rxjs");
var raceUtils_1 = require("../util/raceUtils");
var RaceDataModel = /** @class */ (function () {
    function RaceDataModel() {
        this.events = new ObservableArray([]);
    }
    RaceDataModel.prototype.clear = function () {
        this.events.clear();
    };
    RaceDataModel.prototype.remove = function (messageId) {
        var foundMessage = false;
        for (var eventIndex = 0; eventIndex < this.events.value.length; eventIndex++) {
            var event_1 = this.events.value[eventIndex];
            for (var raceIndex = 0; raceIndex < event_1.races.value.length; raceIndex++) {
                var race = event_1.races.value[raceIndex];
                for (var resultIndex = 0; resultIndex < race.results.length; resultIndex++) {
                    var result = race.results[resultIndex];
                    if (result.messageId == messageId) {
                        foundMessage = true;
                        race.results.splice(resultIndex, 1);
                        break;
                    }
                }
                if (race.results.length == 0) {
                    event_1.races.remove(raceIndex);
                }
                if (foundMessage) {
                    break;
                }
            }
            if (event_1.races.value.length == 0) {
                this.events.remove(eventIndex);
            }
            if (foundMessage) {
                break;
            }
        }
    };
    RaceDataModel.prototype.updateEvents = function (events) {
        var _this = this;
        var newEventIds = events.map(function (x) { return x.id; });
        for (var _i = 0, events_1 = events; _i < events_1.length; _i++) {
            var evt = events_1[_i];
            this.getOrAddEvent(evt.id, evt.name);
        }
        var removeEventIds = this.events
            .value
            .map(function (x) { return x.id; })
            .filter(function (x) { return !newEventIds.some(function (y) { return x == y; }); });
        var eventIndexes = removeEventIds
            .map(function (x) { return _this.events.value.findIndex(function (y) { return y.id == x; }); })
            .filter(function (x) { return x >= 0; });
        this.events.remove(eventIndexes);
    };
    RaceDataModel.prototype.update = function (message) {
        var year = new Date(message.timestamp).getFullYear();
        var existingEvent = this.getOrAddEvent(message.eventId, message.eventId);
        var raceClass = raceUtils_1.RaceUtils.getClass(message.racerId, existingEvent.eventInfo.generalClassName);
        if (raceClass == undefined || !raceUtils_1.RaceUtils.isValidRaceClass(raceClass)) {
            return;
        }
        var existingRace = existingEvent.races.value.find(function (x) { return x.raceId == message.raceId; });
        if (existingRace == undefined) {
            existingRace = {
                event: existingEvent,
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
                race: existingRace,
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
        var existingEventClass = existingEvent.classes.value.find(function (x) { return x.id == raceClass; });
        if (existingEventClass == undefined) {
            existingEventClass = {
                event: existingEvent,
                id: raceClass,
                name: raceClass,
                classIndex: classInfo.index,
                qualificationDefiningProperty: classInfo.qualificationDefiningProperty,
                raceEndDefiningProperty: classInfo.raceEndDefiningProperty,
                eliminatorType: classInfo.eliminatorType,
                results: new ObservableArray([]),
                participants: new ObservableArray([]),
            };
            existingEvent.classes.push(existingEventClass);
        }
        existingEventClass.results.push(existingRace);
        var existingParticipant = existingEventClass.participants.value.find(function (x) { return x.participantId == existingResult.racerId; });
        if (existingParticipant == undefined) {
            existingEventClass.participants.push({ participant: undefined, participantId: existingResult.racerId });
        }
    };
    RaceDataModel.prototype.getOrAddEvent = function (id, name) {
        var eventInfo = this.getDefaultEventInfo(id, name);
        var existingEvent = this.events.value.find(function (x) { return x.id == id; });
        if (existingEvent == undefined) {
            existingEvent = {
                id: id,
                name: name !== null && name !== void 0 ? name : "Unknown event: " + id,
                eventInfo: eventInfo,
                classes: new ObservableArray([]),
                races: new ObservableArray([]),
                participants: new ObservableArray([])
            };
            this.events.push(existingEvent);
        }
        else if (name !== undefined) {
            existingEvent.name = name;
        }
        return existingEvent;
    };
    RaceDataModel.prototype.getDefaultEventInfo = function (id, name) {
        return {
            generalClassName: "DEFAULT",
            classInformations: [],
            qualifyingStageKey: "Q",
            eliminatorStageKey: "E"
        };
    };
    RaceDataModel.prototype.getDefaultClassInfo = function (raceClass, year) {
        var qualificationProp = ["BB", "J/BR"].includes(raceClass) ? RaceQualificationDefiningProperty.ReactionTime : ["SET", "PET", "SPET"].includes(raceClass) ? RaceQualificationDefiningProperty.DialInMargin : RaceQualificationDefiningProperty.QuarterMileTime;
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
    return RaceDataModel;
}());
exports.RaceDataModel = RaceDataModel;
var RaceQualificationDefiningProperty;
(function (RaceQualificationDefiningProperty) {
    RaceQualificationDefiningProperty[RaceQualificationDefiningProperty["Invalid"] = 0] = "Invalid";
    RaceQualificationDefiningProperty[RaceQualificationDefiningProperty["QuarterMileTime"] = 1] = "QuarterMileTime";
    RaceQualificationDefiningProperty[RaceQualificationDefiningProperty["EightMileTime"] = 2] = "EightMileTime";
    RaceQualificationDefiningProperty[RaceQualificationDefiningProperty["ReactionTime"] = 3] = "ReactionTime";
    RaceQualificationDefiningProperty[RaceQualificationDefiningProperty["DialInMargin"] = 4] = "DialInMargin";
})(RaceQualificationDefiningProperty = exports.RaceQualificationDefiningProperty || (exports.RaceQualificationDefiningProperty = {}));
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
        if (item.push == undefined) {
            this.value.push(item);
        }
        else {
            for (var _i = 0, _a = item; _i < _a.length; _i++) {
                var i = _a[_i];
                this.value.push(i);
            }
        }
        this.next(this.value);
    };
    ObservableArray.prototype.remove = function (index) {
        if (index.push == undefined) {
            this.value.splice(index, 1);
        }
        else {
            var sorted = index.sort(function (a, b) { return b - a; });
            for (var _i = 0, sorted_1 = sorted; _i < sorted_1.length; _i++) {
                var i = sorted_1[_i];
                this.value.splice(i, 1);
            }
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