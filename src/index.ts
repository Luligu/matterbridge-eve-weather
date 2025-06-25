import { Matterbridge, PlatformConfig } from 'matterbridge';
import { AnsiLogger } from 'matterbridge/logger';

import { EveWeatherPlatform as EveWeatherPlatform } from './platform.js';

/**
 * This is the standard interface for MatterBridge plugins.
 * Each plugin should export a default function that follows this signature.
 *
 *  @param {Matterbridge} matterbridge - The Matterbridge instance.
 *  @param {AnsiLogger} log - The logger instance for logging messages.
 *  @param {PlatformConfig} config - The platform configuration.
 *  @returns {EveWeatherPlatform} - An instance of the EveWeatherPlatform.
 */
export default function initializePlugin(matterbridge: Matterbridge, log: AnsiLogger, config: PlatformConfig): EveWeatherPlatform {
  return new EveWeatherPlatform(matterbridge, log, config);
}
