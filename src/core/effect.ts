import { HSVState, Effect } from '../types';
import { findLuminaireIndex } from './luminaire';

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
