/*jshint esversion: 6,node: true,-W041: false */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var inherits = require("util").inherits;




const debug = require('debug')('BoschSmartHomeThermostat');



class BoschThermostatAccessory {
    constructor(platform, accessory, log, thermostat) {
        this.platform = platform;
        this.accessory = accessory;
        this.log = log;
        this.accessory.log = log;
        this.thermostat = thermostat;
        this.Service = this.platform.api.hap.Service;
        this.Characteristic = this.platform.api.hap.Characteristic;
        this.enabledServices = [];
        this.displayName = thermostat.name;
        var FakeGatoHistoryService = require('fakegato-history')(this.platform.api);      
        inherits(FakeGatoHistoryService, this.Service);

        BoschThermostatAccessory.ValveOpening = function () {
            platform.api.hap.Characteristic.call(this, 'ValveOpening', 'E863F12E-079E-48FF-8F27-9C2605A29F52');
            this.setProps({
                format: platform.api.hap.Characteristic.Formats.UINT8,
                maxValue: 100,
                minValue: 0,
                minStep: 1,
                perms: [platform.api.hap.Characteristic.Perms.READ]
            });
            this.value = this.getDefaultValue();
        };
        BoschThermostatAccessory.ValveOpening.UUID = 'E863F12E-079E-48FF-8F27-9C2605A29F52';
        inherits(BoschThermostatAccessory.ValveOpening, this.Characteristic);

        BoschThermostatAccessory.ScheduleCommand = function () {
            platform.api.hap.Characteristic.call(this, 'ScheduleCommand', 'E863F12C-079E-48FF-8F27-9C2605A29F52');
            this.setProps({
                format: platform.api.hap.Characteristic.Formats.DATA,
                maxValue: 100,
                minValue: 0,
                minStep: 1,
                perms: [platform.api.hap.Characteristic.Perms.WRITE]
            });
            this.value = this.getDefaultValue();
        };
        BoschThermostatAccessory.ScheduleCommand.UUID = 'E863F12C-079E-48FF-8F27-9C2605A29F52';
        inherits(BoschThermostatAccessory.ScheduleCommand, this.Characteristic);

        BoschThermostatAccessory.ScheduleData = function () {
            platform.api.hap.Characteristic.call(this, 'ScheduleData', 'E863F12F-079E-48FF-8F27-9C2605A29F52');
            this.setProps({
                format: platform.api.hap.Characteristic.Formats.DATA,
                maxValue: 100,
                minValue: 0,
                minStep: 1,
                perms: [platform.api.hap.Characteristic.Perms.READ]
            });
            this.value = this.getDefaultValue();
        };
        BoschThermostatAccessory.ScheduleData.UUID = 'E863F12F-079E-48FF-8F27-9C2605A29F52';
        inherits(BoschThermostatAccessory.ScheduleData, this.Characteristic);
    

        this.log.info("Created new BoschThermostatAccessory");
        this.log.info(JSON.stringify(this.thermostat));
        this.accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'BOSCH')
            .setCharacteristic(this.platform.Characteristic.FirmwareRevision, '1.0.0')
            .setCharacteristic(this.platform.Characteristic.Model, 'Room Thermostat')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, this.thermostat.serial);
        
        this.ThermostatService = this.accessory.getService(this.Service.Thermostat) || this.accessory.addService(this.Service.Thermostat);
        this.ThermostatService.addCharacteristic(BoschThermostatAccessory.ValveOpening);
        this.ThermostatService.addCharacteristic(BoschThermostatAccessory.ScheduleCommand);
        this.ThermostatService.addCharacteristic(BoschThermostatAccessory.ScheduleData);

        // create handlers for required characteristics
        this.ThermostatService.getCharacteristic(this.Characteristic.CurrentHeatingCoolingState)
            .on('get', this.handleCurrentHeatingCoolingStateGet.bind(this));
        this.ThermostatService.getCharacteristic(this.Characteristic.TargetHeatingCoolingState)
            .on('get', this.handleTargetHeatingCoolingStateGet.bind(this))
            .on('set', this.handleTargetHeatingCoolingStateSet.bind(this))
            .setProps({
            validValues: [
                this.platform.Characteristic.TargetHeatingCoolingState.AUTO
            ]
        });
        this.ThermostatService.getCharacteristic(this.Characteristic.CurrentTemperature)
            .on('get', this.handleCurrentTemperatureGet.bind(this))
            .setProps({
            minStep: 0.1,
        });
        this.ThermostatService.getCharacteristic(this.Characteristic.TargetTemperature)
            .on('get', this.handleTargetTemperatureGet.bind(this))
            .on('set', this.handleTargetTemperatureSet.bind(this))
            .setProps({
            minStep: 0.1,
            minValue: 5,
            maxValue: 30
        });
        this.ThermostatService.getCharacteristic(this.Characteristic.TemperatureDisplayUnits)
            .on('get', this.handleTemperatureDisplayUnitsGet.bind(this))
            .on('set', this.handleTemperatureDisplayUnitsSet.bind(this))
            .setProps({
            validValues: [
                this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS
            ]
        });
        // create handlers for required characteristics
        this.ThermostatService.getCharacteristic(this.Characteristic.CurrentRelativeHumidity)
            .on('get', this.handleCurrentRelativeHumidityGet.bind(this));

        this.ThermostatService.getCharacteristic(BoschThermostatAccessory.ValveOpening)
            .on('get', this.handleValveOpeningGet.bind(this));

        this.powerLoggingService = (new FakeGatoHistoryService("custom", this.accessory, { storage: 'fs', disableTimer:true}));
    }
    /**
     * Handle requests to get the current value of the "Current Heating Cooling State" characteristic
     */
    handleCurrentHeatingCoolingStateGet(callback) {
        debug('Triggered GET CurrentHeatingCoolingState');
        // set this to a valid value for CurrentHeatingCoolingState
        if (this.thermostat.currentTemperature >= this.thermostat.targetTemperature) {
            callback(null, this.platform.Characteristic.CurrentHeatingCoolingState.OFF);
        }
        else {
            callback(null, this.platform.Characteristic.CurrentHeatingCoolingState.HEAT);
        }
    }
    /**
     * Handle requests to get the current value of the "Target Heating Cooling State" characteristic
     */
    handleTargetHeatingCoolingStateGet(callback) {
        debug('Triggered GET TargetHeatingCoolingState');
        // set this to a valid value for TargetHeatingCoolingState
        callback(null, this.platform.Characteristic.TargetHeatingCoolingState.AUTO);
    }
    /**
     * Handle requests to set the "Target Heating Cooling State" characteristic
     */
    handleTargetHeatingCoolingStateSet(value, callback) {
        debug('Triggered SET TargetHeatingCoolingState:', value);
        callback(null);
    }
    /**
     * Handle requests to get the current value of the "Current Temperature" characteristic
     */
    handleCurrentTemperatureGet(callback) {
        debug('Triggered GET CurrentTemperature');
        // set this to a valid value for CurrentTemperature
        const currentValue = 1;
        callback(null, this.thermostat.currentTemperature);
    }
    /**
     * Handle requests to get the current value of the "Target Temperature" characteristic
     */
    handleTargetTemperatureGet(callback) {
        debug('Triggered GET TargetTemperature');
        // set this to a valid value for TargetTemperature
        const currentValue = 1;
        callback(null, this.thermostat.targetTemperature);
    }
    /**
     * Handle requests to set the "Target Temperature" characteristic
     */
    handleTargetTemperatureSet(value, callback) {
        debug('Triggered SET TargetTemperature:', value);
        callback(null);
        this.platform.setTemperature(this.thermostat, value);
    }
    /**
     * Handle requests to get the current value of the "Temperature Display Units" characteristic
     */
    handleTemperatureDisplayUnitsGet(callback) {
        debug('Triggered GET TemperatureDisplayUnits');
        // set this to a valid value for TemperatureDisplayUnits
        const currentValue = 0;
        callback(null, currentValue);
    }
    /**
     * Handle requests to set the "Temperature Display Units" characteristic
     */
    handleTemperatureDisplayUnitsSet(value, callback) {
        debug('Triggered SET TemperatureDisplayUnits:', value);
        callback(null);
    }
    handleCurrentRelativeHumidityGet(callback) {
        callback(null, this.thermostat.humidityPercentage);
    }
    handleValveOpeningGet(callback) {
        callback(null, this.thermostat.valvePosition);
    }
}



exports.default = BoschThermostatAccessory;
