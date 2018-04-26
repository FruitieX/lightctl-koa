import * as Koa from 'koa';
import config from './config';

const app = new Koa();

// Register plugins
Object.entries(config).forEach(([path, options]) => {
  const plugin = require(`./plugins/${path}`).register(app, options);
});

//app.listen(config.port);
//console.log(`Server running on port ${config.port}`);
