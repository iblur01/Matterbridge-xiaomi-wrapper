/**
 * Matterbridge Xiaomi Wrapper plugin.
 *
 * @file module.ts
 * @author Théo DELANNOY
 * @license Apache-2.0
 */

import { MatterbridgeAccessoryPlatform, PlatformConfig, PlatformMatterbridge } from 'matterbridge';
import { RoboticVacuumCleaner } from 'matterbridge/devices';
import { AnsiLogger, LogLevel } from 'matterbridge/logger';

export default function initializePlugin(matterbridge: PlatformMatterbridge, log: AnsiLogger, config: PlatformConfig): XiaomiWrapperPlatform {
  return new XiaomiWrapperPlatform(matterbridge, log, config);
}

export class XiaomiWrapperPlatform extends MatterbridgeAccessoryPlatform {
  constructor(matterbridge: PlatformMatterbridge, log: AnsiLogger, config: PlatformConfig) {
    super(matterbridge, log, config);

    if (this.verifyMatterbridgeVersion === undefined || typeof this.verifyMatterbridgeVersion !== 'function' || !this.verifyMatterbridgeVersion('3.4.0')) {
      throw new Error(`This plugin requires Matterbridge version >= "3.4.0". Please update Matterbridge from ${this.matterbridge.matterbridgeVersion} to the latest version in the frontend."`);
    }

    this.log.info('Initializing Xiaomi Wrapper Platform...');
  }

  override async onStart(reason?: string) {
    this.log.info(`onStart called with reason: ${reason ?? 'none'}`);
    await this.ready;
    await this.clearSelect();
    await this.discoverDevices();
  }

  override async onConfigure() {
    await super.onConfigure();
    this.log.info('onConfigure called');
  }

  override async onChangeLoggerLevel(logLevel: LogLevel) {
    this.log.info(`onChangeLoggerLevel called with: ${logLevel}`);
  }

  override async onShutdown(reason?: string) {
    await super.onShutdown(reason);
    this.log.info(`onShutdown called with reason: ${reason ?? 'none'}`);
    if (this.config.unregisterOnShutdown === true) await this.unregisterAllDevices();
  }

  private async discoverDevices() {
    this.log.info('Discovering devices...');

    const vacuum = new RoboticVacuumCleaner('Xiaomi Vacuum', 'SN-DUMMY-001');

    vacuum.addCommandHandler('RvcOperationalState.goHome', async () => {
      this.log.info('goHome command received → robot is heading to dock');
    });

    vacuum.addCommandHandler('RvcOperationalState.resume', async () => {
      this.log.info('resume command received → robot is cleaning');
    });

    vacuum.addCommandHandler('RvcOperationalState.pause', async () => {
      this.log.info('pause command received → robot is paused');
    });

    this.setSelectDevice('SN-DUMMY-001', 'Xiaomi Vacuum');
    const selected = this.validateDevice(['Xiaomi Vacuum', 'SN-DUMMY-001']);
    if (selected) await this.registerDevice(vacuum);
  }
}
