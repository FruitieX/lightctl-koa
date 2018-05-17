import * as Koa from 'koa';
import config from './config';

const init = async () => {
  const app = new Koa();

  // Register core plugins
  require('./core/luminaire').register(app);
  require('./core/effect').register(app);

  // Register extra plugins
  for (const path in config) {
    const options = config[path];
    await require(path).register(app, options);
  }

  app.emit('start');
};

init();

//app.listen(config.port);
//console.log(`Server running on port ${config.port}`);
