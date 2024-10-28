import { Matterbridge, PlatformConfig } from 'matterbridge';
import { AnsiLogger } from 'matterbridge/logger';
import { EveWeatherPlatform } from './platform';
import { jest } from '@jest/globals';

describe('TestPlatform', () => {
  let mockMatterbridge: Matterbridge;
  let mockLog: AnsiLogger;
  let mockConfig: PlatformConfig;
  let testPlatform: EveWeatherPlatform;

  // const log = new AnsiLogger({ logName: 'shellyDeviceTest', logTimestampFormat: TimestampFormat.TIME_MILLIS, logDebug: true });

  beforeEach(() => {
    mockMatterbridge = {
      addBridgedDevice: jest.fn(),
      matterbridgeDirectory: '',
      matterbridgePluginDirectory: 'temp',
      systemInformation: { ipv4Address: undefined },
      matterbridgeVersion: '1.6.0',
      removeAllBridgedDevices: jest.fn(),
    } as unknown as Matterbridge;
    mockLog = { fatal: jest.fn(), error: jest.fn(), warn: jest.fn(), notice: jest.fn(), info: jest.fn(), debug: jest.fn() } as unknown as AnsiLogger;
    mockConfig = {
      'name': 'matterbridge-eve-weather',
      'type': 'AccessoryPlatform',
      'unregisterOnShutdown': false,
      'debug': false,
    } as PlatformConfig;

    testPlatform = new EveWeatherPlatform(mockMatterbridge, mockLog, mockConfig);
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
  });

  it('should call onConfigure', async () => {
    await testPlatform.onConfigure();
    expect(mockLog.info).toHaveBeenCalledWith('onConfigure called');
  });

  it('should call onShutdown with reason', async () => {
    await testPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
  });
});
