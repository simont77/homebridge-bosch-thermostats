/*jshint esversion: 6,node: true,-W041: false */
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const operators_1 = require("rxjs/operators");
const rxjs_1 = require("rxjs");
const debug = require('debug')('BoschSmartHomeThermostat');
const bosch_smart_home_bridge_1 = require("bosch-smart-home-bridge");
const BoschThermostatAccessory_1 = __importDefault(require("./BoschThermostatAccessory"));
const BoschThermostat_1 = __importDefault(require("./BoschThermostat"));
const LogWrapper = require("./logger_debug.js").LogWrapper;
const fs = require('fs');
class BoschThermostatPlatform {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        this.accessories = [];
        this.thermostats = [];
        this.boschThermostats = [];
        api.on('didFinishLaunching', () => {
            this.didFinishLaunching();
        });
    }
    loadCertificate(certificatePath, privateKeyPath) {
        fs.readFile(certificatePath, 'utf-8', (err, certData) => {
            if (err) {
                this.log.error("Could not load cert from " + certificatePath);
                return;
            }
            else {
                fs.readFile(privateKeyPath, 'utf-8', (keyError, keyData) => {
                    if (keyError) {
                        this.log.error("Could not load private key from " + privateKeyPath);
                        return;
                    }
                    else {
                        this.certificate = certData;
                        this.privateKey = keyData;
                        this.establishConnection();
                    }
                 });
            }
        });
    }
    didFinishLaunching() {
        this.log.info('Connecting to BSH host ' + this.config.host);
        this.loadCertificate(this.config.certificatePath, this.config.privateKeyPath);
    }
    establishConnection() {
        this.bshb = bosch_smart_home_bridge_1.BoschSmartHomeBridgeBuilder.builder()
            .withHost(this.config.host)
            .withClientCert(this.certificate)
            .withClientPrivateKey(this.privateKey)
            .withLogger(new LogWrapper())
            .build();
        this.bshb.pairIfNeeded('bshb', "homebridge", this.config.systemPassword).pipe(operators_1.catchError(err => {
            this.log.info("ERROR while checking pairing: " + err.message);
            return rxjs_1.EMPTY;
        }), operators_1.switchMap(pairingResponse => {
            this.log.info("Pairing result:");
            if (pairingResponse) {
                this.log.info("Pairing successful");
                this.log.info(pairingResponse.incomingMessage.statusCode);
                this.log.info(pairingResponse.parsedResponse);
            }
            else {
                this.log.info("Already paired");
            }
            return this.bshb.getBshcClient().getDevices();
        })).subscribe(getDevicesResponse => {
            this.createAccessories(getDevicesResponse.parsedResponse);
            this.timer = setInterval(() => this.updateValues(), 10000);
            this.updateValues();
        });
    }
    createAccessories(devicesResponse) {
        for (var i = 0; i < devicesResponse.length; i++) {
            if (devicesResponse[i].manufacturer == 'BOSCH' && devicesResponse[i].deviceModel == 'ROOM_CLIMATE_CONTROL') {
                let boschThermostat = new BoschThermostat_1.default();
                boschThermostat.id = devicesResponse[i].id;
                boschThermostat.childDeviceIds = devicesResponse[i].childDeviceIds;
                var hmDevice = devicesResponse.find((hmDevice) => hmDevice.id === boschThermostat.childDeviceIds[0]);
                boschThermostat.name = devicesResponse[i].serial + ' ' + hmDevice.name;
                boschThermostat.serial = devicesResponse[i].serial;
                this.boschThermostats.push(boschThermostat);
                const uuid = this.api.hap.uuid.generate('homebridge-bosch-' + boschThermostat.id);
                let accessory = this.accessories.find(accessory => accessory.UUID === uuid);
                if (accessory) {
                    this.log.info('Restoring cached accessory', accessory.displayName);
                    accessory.context.deviceId = boschThermostat.id;
                    this.api.updatePlatformAccessories([accessory]);
                }
                else {
                    this.log.info('Adding new device:', boschThermostat.name);
                    accessory = new this.api.platformAccessory(boschThermostat.name, uuid);
                    accessory.context.deviceId = boschThermostat.id;
                    this.api.registerPlatformAccessories('homebridge-bosch', 'BoschThermostat', [accessory]);
                }
                let boschThermostatAccessory = new BoschThermostatAccessory_1.default(this, accessory, this.log, boschThermostat);
                this.thermostats.push(boschThermostatAccessory);
            }
        }
    }
    updateValues() {
        this.bshb.getBshcClient().getDevicesServices().subscribe(getServicesResponse => {
            debug('got services');
            debug(getServicesResponse.parsedResponse.toString());
            for (var i = 0; i < this.boschThermostats.length; i++) {
                let propertiesForDevice = getServicesResponse.parsedResponse.filter((propertiesForDevice) => (propertiesForDevice.deviceId === this.boschThermostats[i].id) || (propertiesForDevice.deviceId === this.boschThermostats[i].childDeviceIds[0]));
                for (let j = 0; j < propertiesForDevice.length; j++) {
                    debug("Got property " + propertiesForDevice[j].id + ' for device ' + this.boschThermostats[i].id);
                    switch (propertiesForDevice[j].id) {
                        case 'TemperatureLevel':
                            this.boschThermostats[i].currentTemperature = propertiesForDevice[j].state.temperature;
                            break;
                        case 'RoomClimateControl':
                            this.boschThermostats[i].targetTemperature = propertiesForDevice[j].state.setpointTemperature;
                            break;
                        case 'HumidityLevel':
                            debug('setting humdity to', propertiesForDevice[j].state.humidity);
                            this.boschThermostats[i].humidityPercentage = propertiesForDevice[j].state.humidity;
                            break;
                        default:
                            break;
                    }
                }
            }
            for (var i = 0; i < this.thermostats.length; i++) {
                this.thermostats[i].service.updateCharacteristic(this.Characteristic.CurrentTemperature, this.thermostats[i].thermostat.currentTemperature);
                this.thermostats[i].service.updateCharacteristic(this.Characteristic.TargetTemperature, this.thermostats[i].thermostat.targetTemperature);
                this.thermostats[i].service.updateCharacteristic(this.Characteristic.CurrentRelativeHumidity, this.thermostats[i].thermostat.humidityPercentage);
            }
        });
    }
    setTemperature(device, temperature) {
        const path = '/devices/' + device.id + '/services/RoomClimateControl';
        const value = {
            "@type": "climateControlState",
            "setpointTemperature": temperature
        };
        this.bshb.getBshcClient().putState(path, value).subscribe(setResponse => {
            this.log.info('Set temperature of ' + device.name + ' to ' + temperature);
            device.targetTemperature = temperature;
        });
    }
    configureAccessory(accessory) {
        this.accessories.push(accessory);
    }
    getBoschAccessoryWithId(deviceId) {
        return this.thermostats.find((thermostat) => thermostat.thermostat.id === deviceId).accessory;
    }
}
exports.default = BoschThermostatPlatform;
