import path from 'node:path';

import { jest } from '@jest/globals';
import { MatterbridgeEndpoint, PlatformConfig, PlatformMatterbridge } from 'matterbridge';
import { AnsiLogger, LogLevel } from 'matterbridge/logger';
import { VendorId } from 'matterbridge/matter';

import { XiaomiWrapperPlatform } from '../src/module.js';

const mockLog = {
  fatal: jest.fn((message: string, ...parameters: any[]) => {}),
  error: jest.fn((message: string, ...parameters: any[]) => {}),
  warn: jest.fn((message: string, ...parameters: any[]) => {}),
  notice: jest.fn((message: string, ...parameters: any[]) => {}),
  info: jest.fn((message: string, ...parameters: any[]) => {}),
  debug: jest.fn((message: string, ...parameters: any[]) => {}),
} as unknown as AnsiLogger;

const mockMatterbridge: PlatformMatterbridge = {
  systemInformation: {
    ipv4Address: '192.168.1.1',
    ipv6Address: 'fd78:cbf8:4939:746:a96:8277:346f:416e',
    osRelease: 'x.y.z',
    nodeVersion: '22.10.0',
  },
  rootDirectory: path.join('jest', 'XiaomiWrapperPlugin'),
  homeDirectory: path.join('jest', 'XiaomiWrapperPlugin'),
  matterbridgeDirectory: path.join('jest', 'XiaomiWrapperPlugin', '.matterbridge'),
  matterbridgePluginDirectory: path.join('jest', 'XiaomiWrapperPlugin', 'Matterbridge'),
  matterbridgeCertDirectory: path.join('jest', 'XiaomiWrapperPlugin', '.mattercert'),
  globalModulesDirectory: path.join('jest', 'XiaomiWrapperPlugin', 'node_modules'),
  matterbridgeVersion: '3.5.0',
  matterbridgeLatestVersion: '3.5.0',
  matterbridgeDevVersion: '3.5.0',
  bridgeMode: 'bridge',
  restartMode: '',
  aggregatorVendorId: VendorId(0xfff1),
  aggregatorVendorName: 'Matterbridge',
  aggregatorProductId: 0x8000,
  aggregatorProductName: 'Matterbridge aggregator',
  registerVirtualDevice: jest.fn(async (name: string, type: 'light' | 'outlet' | 'switch' | 'mounted_switch', callback: () => Promise<void>) => {}),
  addBridgedEndpoint: jest.fn(async (pluginName: string, device: MatterbridgeEndpoint) => {}),
  removeBridgedEndpoint: jest.fn(async (pluginName: string, device: MatterbridgeEndpoint) => {}),
  removeAllBridgedEndpoints: jest.fn(async (pluginName: string) => {}),
} as unknown as PlatformMatterbridge;

const mockConfig: PlatformConfig = {
  name: 'matterbridge-xiaomi-wrapper',
  type: 'AccessoryPlatform',
  version: '1.0.0',
  whiteList: [],
  blackList: [],
  debug: false,
  unregisterOnShutdown: false,
};

const loggerLogSpy = jest.spyOn(AnsiLogger.prototype, 'log').mockImplementation((level: string, message: string, ...parameters: any[]) => {});

describe('Matterbridge Xiaomi Wrapper', () => {
  let instance: XiaomiWrapperPlatform;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should throw an error if matterbridge is not the required version', async () => {
    // @ts-expect-error Ignore readonly for testing purposes
    mockMatterbridge.matterbridgeVersion = '2.0.0';
    expect(() => new XiaomiWrapperPlatform(mockMatterbridge, mockLog, mockConfig)).toThrow(
      'This plugin requires Matterbridge version >= "3.4.0". Please update Matterbridge from 2.0.0 to the latest version in the frontend.',
    );
    // @ts-expect-error Ignore readonly for testing purposes
    mockMatterbridge.matterbridgeVersion = '3.4.0';
  });

  it('should create an instance of the platform', async () => {
    // @ts-ignore
    instance = (await import('../src/module.ts')).default(mockMatterbridge, mockLog, mockConfig) as unknown as XiaomiWrapperPlatform;
    // @ts-expect-error Accessing private method for testing purposes
    instance.setMatterNode(
      // @ts-expect-error
      mockMatterbridge.addBridgedEndpoint,
      // @ts-expect-error
      mockMatterbridge.removeBridgedEndpoint,
      // @ts-expect-error
      mockMatterbridge.removeAllBridgedEndpoints,
      // @ts-expect-error
      mockMatterbridge.registerVirtualDevice,
    );
    expect(instance.matterbridge).toBe(mockMatterbridge);
    expect(instance.log).toBe(mockLog);
    expect(instance.config).toBe(mockConfig);
    expect(instance.matterbridge.matterbridgeVersion).toBe('3.4.0');
    expect(mockLog.info).toHaveBeenCalledWith('Initializing Xiaomi Wrapper Platform...');
  });

  it('should start with no devices selected (whiteList filter)', async () => {
    mockConfig.whiteList = ['No devices'];
    await instance.onStart('Jest');
    expect(mockLog.info).toHaveBeenCalledWith('onStart called with reason: Jest');
    await instance.onStart();
    expect(mockLog.info).toHaveBeenCalledWith('onStart called with reason: none');
  });

  it('should start and register the dummy vacuum', async () => {
    mockConfig.whiteList = [];
    await instance.onStart('Jest');
    expect(mockLog.info).toHaveBeenCalledWith('onStart called with reason: Jest');
    expect(mockLog.info).toHaveBeenCalledWith('Discovering devices...');
  });

  it('should call RVC operational state command handlers', async () => {
    for (const device of instance.getDevices()) {
      if (device.hasClusterServer('rvcOperationalState')) {
        await device.executeCommandHandler('RvcOperationalState.goHome', {}, 'rvcOperationalState', {} as any, device);
        await device.executeCommandHandler('RvcOperationalState.resume', {}, 'rvcOperationalState', {} as any, device);
        await device.executeCommandHandler('RvcOperationalState.pause', {}, 'rvcOperationalState', {} as any, device);
      }
    }
    expect(mockLog.info).toHaveBeenCalledWith('goHome command received → robot is heading to dock');
    expect(mockLog.info).toHaveBeenCalledWith('resume command received → robot is cleaning');
    expect(mockLog.info).toHaveBeenCalledWith('pause command received → robot is paused');
  });

  it('should configure', async () => {
    await instance.onConfigure();
    expect(mockLog.info).toHaveBeenCalledWith('onConfigure called');
  });

  it('should change logger level', async () => {
    await instance.onChangeLoggerLevel(LogLevel.DEBUG);
    expect(mockLog.info).toHaveBeenCalledWith('onChangeLoggerLevel called with: debug');
  });

  it('should shutdown', async () => {
    await instance.onShutdown('Jest');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason: Jest');

    mockConfig.unregisterOnShutdown = true;
    await instance.onShutdown();
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason: none');
    // @ts-expect-error Accessing private method for testing purposes
    expect(mockMatterbridge.removeAllBridgedEndpoints).toHaveBeenCalled();
    mockConfig.unregisterOnShutdown = false;
  });
});
