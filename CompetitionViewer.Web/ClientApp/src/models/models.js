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
exports.ObservableArray = exports.EliminatorType = exports.RaceEndDefiningProperty = exports.RaceClassDefiningProperty = void 0;
var rxjs_1 = require("rxjs");
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