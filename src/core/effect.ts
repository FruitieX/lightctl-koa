import * as Koa from 'koa';
import { HSVState, Effect } from '../types';
import { findLuminaireIndex } from './luminaire';
import {
  adjustBrightnessOffset,
  setBrightnessOffset,
} from '../plugins/effects/brightness';

export const applyEffectsAll = (
  effects: Effect[],
  colors: HSVState[],
  luminaireId: string,
  numLightSources: number,
): HSVState[] => {
  return effects.reduce(
    (accumulatedColors: HSVState[], effect, effectIndex) => {
      const effectFn = require(`../plugins/effects/${effect.id}`).default;

      const luminaireIndex = findLuminaireIndex(luminaireId);

      return effectFn(
        accumulatedColors,
        effect.options || {},
        luminaireIndex,
        luminaireId,
        numLightSources,
        effectIndex,
        effects.length,
      );
    },
    colors,
  );
};

export const register = async (app: Koa) => {
  app.on('adjustBrightnessOffset', ({ delta }) =>
    adjustBrightnessOffset(delta),
  );
  app.on('setBrightnessOffset', ({ offset }) => setBrightnessOffset(offset));
};
