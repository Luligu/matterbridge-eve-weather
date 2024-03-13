import { DeviceTypes, EveHistory, PressureMeasurement, RelativeHumidityMeasurement, TemperatureDisplayUnits, TemperatureMeasurement, WeatherTrend, logEndpoint } from 'matterbridge';

import { Matterbridge, MatterbridgeDevice, MatterbridgeAccessoryPlatform, MatterHistory } from 'matterbridge';
import { AnsiLogger } from 'node-ansi-logger';

export class EveWeatherPlatform extends MatterbridgeAccessoryPlatform {
  constructor(matterbridge: Matterbridge, log: AnsiLogger) {
    super(matterbridge, log);
  }

  override async onStart(reason?: string) {
    this.log.info('onStart called with reason:', reason ?? 'none');

    const history = new MatterHistory(this.log, 'Eve weather', { filePath: this.matterbridge.matterbridgeDirectory });

    const weather = new MatterbridgeDevice(DeviceTypes.TEMPERATURE_SENSOR);
    weather.createDefaultIdentifyClusterServer();
    //weather.createDefaultBasicInformationClusterServer('Eve weather', '0x84286475', 4874, 'Eve Systems', 1, 'Eve Weather 20EBS9901', 6650, '3.2.1', 1, '1.1');
    weather.createDefaultBasicInformationClusterServer('Eve weather', '0x84286475', 4874, 'Eve Systems', 0x57, 'Eve Weather 20EBS9901', 2996, '2.1.3', 1, '1.1');
    weather.createDefaultTemperatureMeasurementClusterServer(20 * 100);

    weather.addDeviceType(DeviceTypes.HUMIDITY_SENSOR);
    weather.createDefaultRelativeHumidityMeasurementClusterServer(50 * 100);

    weather.addDeviceType(DeviceTypes.PRESSURE_SENSOR);
    weather.createDefaultPressureMeasurementClusterServer(950);

    weather.createDefaultPowerSourceRechargableBatteryClusterServer(87);
    weather.createDefaultPowerSourceConfigurationClusterServer(1);

    // Add the EveHistory cluster to the device as last cluster!
    weather.createWeatherEveHistoryClusterServer(history, this.log);
    history.autoPilot(weather);

    await this.registerDevice(weather);

    weather.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.warn(`Command identify called identifyTime:${identifyTime}`);
      logEndpoint(weather);
      history.logHistory(false);
    });

    weather.getClusterServerById(EveHistory.Cluster.id)?.setElevationAttribute(250); // Elevation in mt
    weather.getClusterServerById(EveHistory.Cluster.id)?.setWeatherTrendAttribute(WeatherTrend.SUN);
    weather.getClusterServerById(EveHistory.Cluster.id)?.setTemperatureDisplayUnitsAttribute(TemperatureDisplayUnits.CELSIUS);
    weather.getClusterServerById(EveHistory.Cluster.id)?.setLastPressureAttribute(950);

    let minTemperature = 0;
    let maxTemperature = 0;
    history.setMaxMinTemperature(maxTemperature, minTemperature);

    setInterval(
      () => {
        const temperature = history.getFakeLevel(10, 30, 2);
        if (minTemperature === 0) minTemperature = temperature;
        if (maxTemperature === 0) maxTemperature = temperature;
        minTemperature = Math.min(minTemperature, temperature);
        maxTemperature = Math.max(maxTemperature, temperature);
        const humidity = history.getFakeLevel(1, 99, 2);
        const pressure = history.getFakeLevel(700, 1100, 1);
        weather.getClusterServerById(TemperatureMeasurement.Cluster.id)?.setMeasuredValueAttribute(temperature * 100);
        weather.getClusterServerById(RelativeHumidityMeasurement.Cluster.id)?.setMeasuredValueAttribute(humidity * 100);
        weather.getClusterServerById(PressureMeasurement.Cluster.id)?.setMeasuredValueAttribute(pressure);

        // The Eve app doesn't read the pressure from the PressureMeasurement cluster (Home app doesn't have it!), so we set it in the EveHistory cluster
        weather.getClusterServerById(EveHistory.Cluster.id)?.setLastPressureAttribute(pressure);

        history.setMaxMinTemperature(maxTemperature, minTemperature);
        history.addEntry({ time: history.now(), temperature, humidity, pressure });
        this.log.info(`Set temperature: ${temperature} (min: ${minTemperature} max: ${maxTemperature}) humidity: ${humidity} pressure: ${pressure}`);
      },
      60 * 1000 - 100,
    );
  }

  override async onShutdown(reason?: string) {
    this.log.info('onShutdown called with reason:', reason ?? 'none');
  }
}
