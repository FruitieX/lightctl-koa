import cosmiconfig = require('cosmiconfig');
import { Scene, Group, Luminaire } from './types';

interface Config {
  port: number;
  'core/group': { [propName: string]: Group };
  'core/scene': { [propName: string]: Scene };
  [propName: string]: any; // TODO
}

const defaultConfig = {
  port: 5678,
  groups: {},
  scenes: {},
  plugins: {},
};

const explorer = cosmiconfig('lightctl', {
  sync: true,
});

// @ts-ignore: lol it's filepath not filePath
const { config: config, filepath }: { config: Config } = explorer.load() || {
  config: defaultConfig,
};

if (filepath) {
  console.log('Using config from', filepath);
} else {
  console.log('No config found, using defaults...');
}

export default config;
