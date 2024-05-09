import { DeviceTypes, EveHistory, PlatformConfig, PowerSource, PressureMeasurement, RelativeHumidityMeasurement, TemperatureDisplayUnits, TemperatureMeasurement, WeatherTrend } from 'matterbridge';

import { Matterbridge, MatterbridgeDevice, MatterbridgeAccessoryPlatform, MatterHistory } from 'matterbridge';
import { AnsiLogger } from 'node-ansi-logger';

export class EveWeatherPlatform extends MatterbridgeAccessoryPlatform {
  weather: MatterbridgeDevice | undefined;
  history: MatterHistory | undefined;
  interval: NodeJS.Timeout | undefined;

  constructor(matterbridge: Matterbridge, log: AnsiLogger, config: PlatformConfig) {
    super(matterbridge, log, config);
  }

  override async onStart(reason?: string) {
    this.log.info('onStart called with reason:', reason ?? 'none');

    this.history = new MatterHistory(this.log, 'Eve weather', { filePath: this.matterbridge.matterbridgeDirectory });

    this.weather = new MatterbridgeDevice(DeviceTypes.TEMPERATURE_SENSOR);
    this.weather.createDefaultIdentifyClusterServer();
    this.weather.createDefaultBasicInformationClusterServer('Eve weather', '0x84286995', 4874, 'Eve Systems', 0x57, 'Eve Weather 20EBS9901', 2996, '2.1.3', 1, '1.1');
    this.weather.createDefaultTemperatureMeasurementClusterServer(20 * 100);

    this.weather.addDeviceType(DeviceTypes.HUMIDITY_SENSOR);
    this.weather.createDefaultRelativeHumidityMeasurementClusterServer(50 * 100);

    this.weather.addDeviceType(DeviceTypes.PRESSURE_SENSOR);
    this.weather.createDefaultPressureMeasurementClusterServer(950);

    this.weather.createDefaultPowerSourceReplaceableBatteryClusterServer(87, PowerSource.BatChargeLevel.Ok, 1500, 'CR2450', 1);
    //weather.createDefaultPowerSourceConfigurationClusterServer(1);

    // Add the EveHistory cluster to the device as last cluster!
    this.weather.createWeatherEveHistoryClusterServer(this.history, this.log);
    this.history.autoPilot(this.weather);

    await this.registerDevice(this.weather);

    this.weather.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.warn(`Command identify called identifyTime:${identifyTime}`);
      this.history?.logHistory(false);
    });

    this.weather.getClusterServerById(EveHistory.Cluster.id)?.setElevationAttribute(250); // Elevation in mt
    this.weather.getClusterServerById(EveHistory.Cluster.id)?.setWeatherTrendAttribute(WeatherTrend.SUN);
    this.weather.getClusterServerById(EveHistory.Cluster.id)?.setTemperatureDisplayUnitsAttribute(TemperatureDisplayUnits.CELSIUS);
    this.weather.getClusterServerById(EveHistory.Cluster.id)?.setAirPressureAttribute(950);
  }

  override async onConfigure() {
    this.log.info('onConfigure called');

    let minTemperature = 0;
    let maxTemperature = 0;

    this.interval = setInterval(
      () => {
        if (!this.weather || !this.history) return;
        const temperature = this.history.getFakeLevel(10, 30, 2);
        if (minTemperature === 0) minTemperature = temperature;
        if (maxTemperature === 0) maxTemperature = temperature;
        minTemperature = Math.min(minTemperature, temperature);
        maxTemperature = Math.max(maxTemperature, temperature);
        const humidity = this.history.getFakeLevel(1, 99, 2);
        const pressure = this.history.getFakeLevel(700, 1100, 1);
        this.weather.getClusterServerById(TemperatureMeasurement.Cluster.id)?.setMeasuredValueAttribute(temperature * 100);
        this.weather.getClusterServerById(TemperatureMeasurement.Cluster.id)?.setMinMeasuredValueAttribute(minTemperature * 100);
        this.weather.getClusterServerById(TemperatureMeasurement.Cluster.id)?.setMaxMeasuredValueAttribute(maxTemperature * 100);
        this.weather.getClusterServerById(TemperatureMeasurement.Cluster.id)?.setMeasuredValueAttribute(temperature * 100);
        this.weather.getClusterServerById(RelativeHumidityMeasurement.Cluster.id)?.setMeasuredValueAttribute(humidity * 100);
        this.weather.getClusterServerById(PressureMeasurement.Cluster.id)?.setMeasuredValueAttribute(pressure);

        if (pressure < 800) this.weather.getClusterServerById(EveHistory.Cluster.id)?.setWeatherTrendAttribute(WeatherTrend.RAIN_WIND);
        else if (pressure < 900) this.weather.getClusterServerById(EveHistory.Cluster.id)?.setWeatherTrendAttribute(WeatherTrend.RAIN);
        else if (pressure < 1000) this.weather.getClusterServerById(EveHistory.Cluster.id)?.setWeatherTrendAttribute(WeatherTrend.CLOUDS_SUN);
        else this.weather.getClusterServerById(EveHistory.Cluster.id)?.setWeatherTrendAttribute(WeatherTrend.SUN);

        // The Eve app doesn't read the pressure from the PressureMeasurement cluster (Home app doesn't have it!), so we set it in the EveHistory cluster
        this.weather.getClusterServerById(EveHistory.Cluster.id)?.setAirPressureAttribute(pressure);

        this.history.setMaxMinTemperature(maxTemperature, minTemperature);
        this.history.addEntry({ time: this.history.now(), temperature, humidity, pressure });
        this.log.info(`Set temperature: ${temperature} (min: ${minTemperature} max: ${maxTemperature}) humidity: ${humidity} pressure: ${pressure}`);
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
