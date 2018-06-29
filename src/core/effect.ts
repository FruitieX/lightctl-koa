import * as Koa from 'koa';
import { ColourModes } from 'chromatism2';
import { Effect } from '../types';
import { findLuminaireIndex } from './luminaire';
import {
  adjustBrightnessOffset,
  setBrightnessOffset,
} from '../plugins/effects/brightness';

interface Options {
  preEffects?: Effect[],
  postEffects?: Effect[]
}

interface State {
  preEffects: Effect[],
  postEffects: Effect[]
}

const state: State = {
  preEffects: [],
  postEffects: []
};

export const applyEffectsAll = (
  effects: Effect[],
  colors: ColourModes.Any[],
  luminaireId: string,
  numLightSources: number,
): ColourModes.Any[] => {
  return [...state.preEffects, ...effects, ...state.postEffects].reduce(
    (accumulatedColors: ColourModes.Any[], effect, effectIndex) => {
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

export const register = async (app: Koa, options: Options) => {
  options.preEffects && (state.preEffects = options.preEffects);
  options.postEffects && (state.postEffects = options.postEffects);

  app.on('adjustBrightnessOffset', ({ delta }) =>
    adjustBrightnessOffset(delta),
  );
  app.on('setBrightnessOffset', ({ offset }) => setBrightnessOffset(offset));
};
