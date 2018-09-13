import * as Koa from 'koa';
import config from './config';

// core plugins
import * as luminaire from './core/luminaire';
import * as effect from './core/effect';
import * as group from './core/group';
import * as room from './core/room';
import * as scene from './core/scene';

const init = async () => {
  const app = new Koa();

  // Register core plugins
  luminaire.register(app, config.luminaire);
  group.register(app, config.group);
  room.register(app, config.room);
  effect.register(app, config.effect);
  scene.register(app, config.scene);

  // Register extra plugins
  for (const i in config.plugins) {
    const plugin = config.plugins[i] || {};
    await require(plugin.path).register(app, plugin.config);
  }

  app.emit('start');
};

init();

//app.listen(config.port);
//console.log(`Server running on port ${config.port}`);
