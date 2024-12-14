/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import { ClusterServerObj, Identify, Matterbridge, PlatformConfig } from 'matterbridge';
import { AnsiLogger } from 'matterbridge/logger';
import { EveWeatherPlatform } from './platform';
import { jest } from '@jest/globals';

describe('TestPlatform', () => {
  let mockMatterbridge: Matterbridge;
  let mockLog: AnsiLogger;
  let mockConfig: PlatformConfig;
  let testPlatform: EveWeatherPlatform;

  async function invokeCommands(cluster: ClusterServerObj, data?: Record<string, boolean | number | bigint | string | object | null | undefined>): Promise<void> {
    const commands = (cluster as any).commands as object;
    for (const [key, value] of Object.entries(commands)) {
      if (typeof value.handler === 'function') await value.handler(data ?? {});
    }
  }

  async function invokeCommand(cluster: ClusterServerObj, command: string, data?: Record<string, boolean | number | bigint | string | object | null | undefined>): Promise<void> {
    const commands = (cluster as any).commands as object;
    for (const [key, value] of Object.entries(commands)) {
      if (key === command && typeof value.handler === 'function') await value.handler(data ?? {});
    }
  }

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not initialize platform with wrong version', () => {
    mockMatterbridge.matterbridgeVersion = '1.5.0';
    expect(() => (testPlatform = new EveWeatherPlatform(mockMatterbridge, mockLog, mockConfig))).toThrow();
    mockMatterbridge.matterbridgeVersion = '1.6.6';
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
    expect(testPlatform.weather?.getAllClusterServers()).toHaveLength(9);
  });

  it('should call onConfigure', async () => {
    jest.useFakeTimers();

    await testPlatform.onConfigure();
    expect(mockLog.info).toHaveBeenCalledWith('onConfigure called');
    expect(testPlatform.weather).toBeDefined();
    expect(testPlatform.weather?.getAllClusterServers()).toHaveLength(9);

    for (let i = 0; i < 100; i++) jest.advanceTimersByTime(61 * 1000);

    // expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('Set temperature'));

    jest.useRealTimers();
  });

  it('should execute the commandHandlers', async () => {
    expect(testPlatform.weather).toBeDefined();
    expect(testPlatform.weather?.getAllClusterServers()).toHaveLength(9);
    const identify = testPlatform.weather?.getClusterServerById(Identify.Cluster.id);
    expect(identify).toBeDefined();
    await invokeCommands(identify as ClusterServerObj);
  });

  it('should call onShutdown with reason', async () => {
    await testPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
  });
});
