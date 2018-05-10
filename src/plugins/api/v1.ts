import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as bodyParser from 'koa-bodyparser';
import { updateLuminaires } from '../../core/luminaire';

interface Options {
  port?: number;
}

const updateLuminaire_: Router.IMiddleware = (ctx, next) => {
  ctx.body = updateLuminaires([
    {
      id: ctx.params.id,
      colors: ctx.request.body.colors || [],
      effects: ctx.request.body.effects || [],
      transitionTime: isNaN(ctx.request.body.transitionTime)
        ? 500
        : ctx.request.body.transitionTime,
    },
  ]);
};

export const register = async (app_: Koa, options: Options) => {
  const app = new Koa();
  const router = new Router();

  app.use(bodyParser());
  app.use(router.routes()).use(router.allowedMethods());

  router.patch('updateLuminaire', '/luminaires/:id', updateLuminaire_);
  //router.get('luminaires', '/luminaires', getLuminaires_);
  //router.get('luminaire', '/luminaires/:id', getLuminaire_);

  const port = options.port || 5678;
  app.listen(port);
  console.log(`api/v1 bound to port ${port}`);
};
