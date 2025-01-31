/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Matterbridge, MatterbridgeEndpoint, PlatformConfig } from 'matterbridge';
import { Identify } from 'matterbridge/matter/clusters';
import { AnsiLogger } from 'matterbridge/logger';
import { EveWeatherPlatform } from './platform';
import { jest } from '@jest/globals';

describe('TestPlatform', () => {
  let testPlatform: EveWeatherPlatform;

  // Spy on and mock AnsiLogger.log
  const loggerLogSpy = jest.spyOn(AnsiLogger.prototype, 'log').mockImplementation((level: string, message: string, ...parameters: any[]) => {
    //
  });

  const mockLog = {
    fatal: jest.fn((message: string, ...parameters: any[]) => {
      // console.log('mockLog.fatal', message, parameters);
    }),
    error: jest.fn((message: string, ...parameters: any[]) => {
      // console.log('mockLog.error', message, parameters);
    }),
    warn: jest.fn((message: string, ...parameters: any[]) => {
      // console.log('mockLog.warn', message, parameters);
    }),
    notice: jest.fn((message: string, ...parameters: any[]) => {
      // console.log('mockLog.notice', message, parameters);
    }),
    info: jest.fn((message: string, ...parameters: any[]) => {
      // console.log('mockLog.info', message, parameters);
    }),
    debug: jest.fn((message: string, ...parameters: any[]) => {
      // console.log('mockLog.debug', message, parameters);
    }),
  } as unknown as AnsiLogger;

  const mockMatterbridge = {
    matterbridgeDirectory: './jest/matterbridge',
    matterbridgePluginDirectory: './jest/plugins',
    systemInformation: { ipv4Address: undefined, ipv6Address: undefined, osRelease: 'xx.xx.xx.xx.xx.xx', nodeVersion: '22.1.10' },
    matterbridgeVersion: '2.1.0',
    edge: true,
    log: mockLog,
    getDevices: jest.fn(() => {
      // console.log('getDevices called');
      return [];
    }),
    getPlugins: jest.fn(() => {
      // console.log('getDevices called');
      return [];
    }),
    addBridgedEndpoint: jest.fn(async (pluginName: string, device: MatterbridgeEndpoint) => {
      // console.log('addBridgedEndpoint called');
    }),
    removeBridgedEndpoint: jest.fn(async (pluginName: string, device: MatterbridgeEndpoint) => {
      // console.log('removeBridgedEndpoint called');
    }),
    removeAllBridgedEndpoints: jest.fn(async (pluginName: string) => {
      // console.log('removeAllBridgedEndpoints called');
    }),
  } as unknown as Matterbridge;

  const mockConfig = {
    'name': 'matterbridge-eve-weather',
    'type': 'AccessoryPlatform',
    'unregisterOnShutdown': false,
    'debug': false,
  } as PlatformConfig;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not initialize platform with wrong version', () => {
    mockMatterbridge.matterbridgeVersion = '1.5.0';
    expect(() => (testPlatform = new EveWeatherPlatform(mockMatterbridge, mockLog, mockConfig))).toThrow();
    mockMatterbridge.matterbridgeVersion = '2.1.0';
  });

  it('should initialize platform with config name', () => {
    mockConfig.noDevices = true;
    mockConfig.delayStart = true;
    testPlatform = new EveWeatherPlatform(mockMatterbridge, mockLog, mockConfig);
    expect(mockLog.info).toHaveBeenCalledWith('Initializing platform:', mockConfig.name);
  });

  it('should call onStart with reason', async () => {
    await testPlatform.onStart('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onStart called with reason:', 'Test reason');
    expect(testPlatform.weather).toBeDefined();
    if (!testPlatform.weather) return;
    expect(Object.keys(testPlatform.weather.behaviors.supported)).toHaveLength(8); // ["descriptor", "matterbridge", "identify", "temperatureMeasurement", "relativeHumidityMeasurement", "pressureMeasurement", "powerSource", "eveHistory"]
  });

  it('should call onConfigure', async () => {
    expect(testPlatform.weather).toBeDefined();
    if (!testPlatform.weather) return;
    expect(Object.keys(testPlatform.weather.behaviors.supported)).toHaveLength(8); // ["descriptor", "matterbridge", "identify", "temperatureMeasurement", "relativeHumidityMeasurement", "pressureMeasurement", "powerSource", "eveHistory"]

    jest.useFakeTimers();

    await testPlatform.onConfigure();
    expect(mockLog.info).toHaveBeenCalledWith('onConfigure called');

    for (let i = 0; i < 100; i++) jest.advanceTimersByTime(61 * 1000);

    expect(mockLog.info).toHaveBeenCalledTimes(1);
    expect(mockLog.error).toHaveBeenCalledTimes(0);

    jest.useRealTimers();
  });

  it('should execute the commandHandlers', async () => {
    expect(testPlatform.weather).toBeDefined();
    if (!testPlatform.weather) return;
    expect(Object.keys(testPlatform.weather.behaviors.supported)).toHaveLength(8); // ["descriptor", "matterbridge", "identify", "temperatureMeasurement", "relativeHumidityMeasurement", "pressureMeasurement", "powerSource", "eveHistory"]

    await testPlatform.weather.executeCommandHandler('identify', { identifyTime: 5 });
    await testPlatform.weather.executeCommandHandler('triggerEffect', { effectIdentifier: Identify.EffectIdentifier.Blink, effectVariant: Identify.EffectVariant.Default });
  });

  it('should call onShutdown with reason', async () => {
    await testPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
  });
});
