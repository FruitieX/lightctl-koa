import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as bodyParser from 'koa-bodyparser';
import {
  updateLuminaires,
  getLuminaires,
  getLuminaire,
} from '../../core/luminaire';
import { activateScene } from '../../core/scene';
import { updateLuminaireOrGroup } from '../../core/group';

interface Options {
  port?: number;
}

const updateLuminaire_: Router.IMiddleware = (ctx, next) => {
  ctx.body = updateLuminaireOrGroup({
    id: ctx.params.id,
    colors: ctx.request.body.colors || [],
    effects: ctx.request.body.effects || [],
    transitionTime: isNaN(ctx.request.body.transitionTime)
      ? 500
      : ctx.request.body.transitionTime,
  });
};

const activateScene_: Router.IMiddleware = (ctx, next) => {
  ctx.body = activateScene(ctx.params.id);
};

const getLuminaires_: Router.IMiddleware = (ctx, next) => {
  ctx.body = getLuminaires();
};

const getLuminaire_: Router.IMiddleware = (ctx, next) => {
  ctx.body = getLuminaire(ctx.params.id);
};

export const register = async (app_: Koa, options: Options) => {
  const app = new Koa();
  const router = new Router({ prefix: '/api/v1' });

  app.use(bodyParser());
  app.use(router.routes()).use(router.allowedMethods());

  router.patch('updateLuminaire', '/luminaires/:id', updateLuminaire_);
  router.post('activateScene', '/scenes/:id', activateScene_);
  router.get('luminaires', '/luminaires', getLuminaires_);
  router.get('luminaire', '/luminaires/:id', getLuminaire_);

  const port = options.port || 5678;
  app.listen(port);
  console.log(`api/v1 bound to port ${port}`);
};
