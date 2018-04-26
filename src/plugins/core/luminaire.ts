import { HSVState, LightSource, Luminaire } from '../../types';
import { createLightSource } from './lightsource';
import * as Koa from 'koa';

interface Options {}

interface State {
  app?: Koa;
  luminaires: {
    [id: string]: Luminaire;
  };
}

const state: State = {
  luminaires: {},
};

const createLuminaire = (
  id: string,
  gateway: string,
  numLights: number,
): Luminaire => ({
  id,
  gateway,
  lightSources: [...Array(numLights)].map(createLightSource),
  colors: [],
  effects: [],
});

export const registerLuminaire = (
  id: string,
  gateway: string,
  numLights: number,
): Luminaire => {
  if (!state.app) throw 'Plugin not yet initialized';
  if (state.luminaires[id]) throw `Luminaire already exists with id ${id}`;

  const luminaire = createLuminaire(id, gateway, numLights);
  state.luminaires[id] = luminaire;
  state.app.emit('luminaireRegistered', luminaire);
  return luminaire;
};

export const getLuminaire = (id: string): Luminaire | undefined => {
  return state.luminaires[id];
};

export const register = (app: Koa, options: Options) => {
  state.app = app;
};
