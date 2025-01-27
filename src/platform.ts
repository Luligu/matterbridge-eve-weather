import {
  Matterbridge,
  MatterbridgeAccessoryPlatform,
  PlatformConfig,
  PowerSource,
  PressureMeasurement,
  RelativeHumidityMeasurement,
  TemperatureMeasurement,
  powerSource,
  MatterbridgeEndpoint,
  temperatureSensor,
  humiditySensor,
  pressureSensor,
} from 'matterbridge';
import { MatterHistory } from 'matter-history';
import { AnsiLogger } from 'matterbridge/logger';

export class EveWeatherPlatform extends MatterbridgeAccessoryPlatform {
  weather: MatterbridgeEndpoint | undefined;
  history: MatterHistory | undefined;
  interval: NodeJS.Timeout | undefined;

  minTemperature = 0;
  maxTemperature = 0;

  constructor(matterbridge: Matterbridge, log: AnsiLogger, config: PlatformConfig) {
    super(matterbridge, log, config);

    // Verify that Matterbridge is the correct version
    if (this.verifyMatterbridgeVersion === undefined || typeof this.verifyMatterbridgeVersion !== 'function' || !this.verifyMatterbridgeVersion('2.1.0')) {
      throw new Error(
        `This plugin requires Matterbridge version >= "2.1.0". Please update Matterbridge from ${this.matterbridge.matterbridgeVersion} to the latest version in the frontend."`,
      );
    }

    this.log.info('Initializing platform:', this.config.name);
  }

  override async onStart(reason?: string) {
    this.log.info('onStart called with reason:', reason ?? 'none');

    this.history = new MatterHistory(this.log, 'Eve weather', { filePath: this.matterbridge.matterbridgeDirectory });

    this.weather = new MatterbridgeEndpoint([temperatureSensor, humiditySensor, pressureSensor, powerSource], { uniqueStorageKey: 'Eve weather' }, this.config.debug as boolean);
    this.weather.createDefaultIdentifyClusterServer();
    this.weather.createDefaultBasicInformationClusterServer('Eve weather', '0x84286995', 4874, 'Eve Systems', 0x57, 'Eve Weather 20EBS9901', 2996, '2.1.3', 1, '1.1');
    this.weather.createDefaultTemperatureMeasurementClusterServer(20 * 100);
    this.weather.createDefaultRelativeHumidityMeasurementClusterServer(50 * 100);
    this.weather.createDefaultPressureMeasurementClusterServer(950);
    this.weather.createDefaultPowerSourceReplaceableBatteryClusterServer(87, PowerSource.BatChargeLevel.Ok, 1500, 'CR2450', 1);

    // Add the EveHistory cluster to the device as last cluster!
    this.history.createWeatherEveHistoryClusterServer(this.weather, this.log);
    this.history.autoPilot(this.weather);

    await this.registerDevice(this.weather);

    this.weather.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.warn(`Command identify called identifyTime:${identifyTime}`);
      this.history?.logHistory(false);
    });

    this.weather.addCommandHandler('triggerEffect', async ({ request: { effectIdentifier, effectVariant } }) => {
      this.log.warn(`Command triggerEffect called effect ${effectIdentifier} variant ${effectVariant}`);
      this.history?.logHistory(false);
    });
  }

  override async onConfigure() {
    this.log.info('onConfigure called');

    /*
    this.weather?.getClusterServerById(EveHistory.Cluster.id)?.setElevationAttribute(250); // Elevation in mt
    this.weather?.getClusterServerById(EveHistory.Cluster.id)?.setWeatherTrendAttribute(WeatherTrend.SUN);
    this.weather?.getClusterServerById(EveHistory.Cluster.id)?.setTemperatureDisplayUnitsAttribute(TemperatureDisplayUnits.CELSIUS);
    this.weather?.getClusterServerById(EveHistory.Cluster.id)?.setAirPressureAttribute(950);
    */

    this.interval = setInterval(
      async () => {
        if (!this.weather || !this.history) return;
        const temperature = this.history.getFakeLevel(10, 30, 2);
        if (this.minTemperature === 0) this.minTemperature = temperature;
        if (this.maxTemperature === 0) this.maxTemperature = temperature;
        this.minTemperature = Math.min(this.minTemperature, temperature);
        this.maxTemperature = Math.max(this.maxTemperature, temperature);
        const humidity = this.history.getFakeLevel(1, 99, 2);
        const pressure = this.history.getFakeLevel(700, 1100, 1);
        await this.weather.setAttribute(TemperatureMeasurement.Cluster.id, 'minMeasuredValue', this.minTemperature * 100, this.log);
        await this.weather.setAttribute(TemperatureMeasurement.Cluster.id, 'maxMeasuredValue', this.maxTemperature * 100, this.log);
        await this.weather.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', temperature * 100, this.log);
        await this.weather.setAttribute(RelativeHumidityMeasurement.Cluster.id, 'measuredValue', humidity * 100, this.log);
        await this.weather.setAttribute(PressureMeasurement.Cluster.id, 'measuredValue', pressure, this.log);

        /*
        this.weather.getClusterServerById(EveHistory.Cluster.id)?.setWeatherTrendAttribute(WeatherTrend.SUN);
        if (pressure < 800) this.weather.getClusterServerById(EveHistory.Cluster.id)?.setWeatherTrendAttribute(WeatherTrend.RAIN_WIND);
        else if (pressure < 900) this.weather.getClusterServerById(EveHistory.Cluster.id)?.setWeatherTrendAttribute(WeatherTrend.RAIN);
        else if (pressure < 1000) this.weather.getClusterServerById(EveHistory.Cluster.id)?.setWeatherTrendAttribute(WeatherTrend.CLOUDS_SUN);

        // The Eve app doesn't read the pressure from the PressureMeasurement cluster (Home app doesn't have it!), so we set it in the EveHistory cluster
        this.weather.getClusterServerById(EveHistory.Cluster.id)?.setAirPressureAttribute(pressure);
        */

        this.history.setMaxMinTemperature(this.maxTemperature, this.minTemperature);
        this.history.addEntry({ time: this.history.now(), temperature, humidity, pressure });
        this.log.info(`Set temperature: ${temperature} (min: ${this.minTemperature} max: ${this.maxTemperature}) humidity: ${humidity} pressure: ${pressure}`);
      },
      60 * 1000 - 100,
    );
  }

  override async onShutdown(reason?: string) {
    this.log.info('onShutdown called with reason:', reason ?? 'none');
    await this.history?.close();
    clearInterval(this.interval);
    if (this.config.unregisterOnShutdown === true) await this.unregisterAllDevices();
  }
}
