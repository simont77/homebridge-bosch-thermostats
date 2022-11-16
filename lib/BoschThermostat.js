/*jshint esversion: 6,node: true,-W041: false */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BoschThermostat {
    constructor() {
        this.humidityPercentage = 50;
        this.currentTemperature = 10;
        this.targetTemperature = 20;
        this.valvePosition = 50;
    }
}
exports.default = BoschThermostat;
