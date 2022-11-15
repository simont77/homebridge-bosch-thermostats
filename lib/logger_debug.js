/*jshint esversion: 6,node: true,-W041: false */
//"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogWrapper = void 0;
// This class exposes the Hombridge logger with a logger interface compatible
// to the bosch-smart-home-bridge library
const debug_w = require('debug')('BoschSmartHomeThermostat_warning');
const debug_i = require('debug')('BoschSmartHomeThermostat_info');
const debug_f = require('debug')('BoschSmartHomeThermostat_fine');
const debug_e = require('debug')('BoschSmartHomeThermostat_error');
const debug_d = require('debug')('BoschSmartHomeThermostat_debug');


var LogWrapper = /** @class */ (function () {
    class LogWrapper {
        constructor() {
            //this.log = log;
        }
        fine(message) {
            var _a;
            var optionalParams = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                optionalParams[_i - 1] = arguments[_i];
            }
            (_a = debug_f).apply(_a, __spreadArray([message], optionalParams, false));
        }
        debug(message) {
            var _a;
            var optionalParams = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                optionalParams[_i - 1] = arguments[_i];
            }
            (_a = debug_d).apply(_a, __spreadArray([message], optionalParams, false));
        }
        info(message) {
            var _a;
            var optionalParams = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                optionalParams[_i - 1] = arguments[_i];
            }
            (_a = debug_i).apply(_a, __spreadArray([message], optionalParams, false));
        }
        warn(message) {
            var _a;
            var optionalParams = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                optionalParams[_i - 1] = arguments[_i];
            }
            (_a = debug_w).apply(_a, __spreadArray([message], optionalParams, false));
        }
        error(message) {
            var _a;
            var optionalParams = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                optionalParams[_i - 1] = arguments[_i];
            }
            (_a = debug_e).apply(_a, __spreadArray([message], optionalParams, false));
        }
    }
    return LogWrapper;
}());
exports.LogWrapper = LogWrapper;