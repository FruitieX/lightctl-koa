import { HSVState, Effect } from '../types';

export const applyEffectsAll = (
  effects: Effect[],
  colors: HSVState[],
  luminaireId: string,
  numLightSources: number,
): HSVState[] => {
  return effects.reduce(
    (accumulatedColors: HSVState[], effect, effectIndex) => {
      const effectFn = require(`../${effect.id}`);

      return effectFn(
        accumulatedColors,
        effect.options,
        luminaireId,
        numLightSources,
        effectIndex,
        effects.length,
      );
    },
    colors,
  );
};
