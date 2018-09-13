import config from '../lightctl.config';

import { RoomConfig } from './core/room';
import { GroupConfig } from './core/group';
import { EffectConfig } from './core/effect';
import { LuminaireConfig } from './core/luminaire';
import { SceneConfig } from './core/scene';

// TODO: union of all possible plugin configs
type PluginConfig = {};

interface Plugin {
  path: string;
  config: PluginConfig;
}

export interface Config {
  luminaire: LuminaireConfig;
  effect: EffectConfig;
  group: GroupConfig;
  room: RoomConfig;
  scene: SceneConfig;
  plugins: Plugin[];
}

export default config;
