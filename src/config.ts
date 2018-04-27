import cosmiconfig = require('cosmiconfig');
import { Scene, Group, Luminaire } from './types';

interface Config {
  './plugins/group'?: { [propName: string]: Group };
  './plugins/scene'?: { [propName: string]: Scene };
  [propName: string]: any; // TODO
}

const defaultConfig: Config = {};

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
