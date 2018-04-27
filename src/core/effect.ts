import { HSVState } from '../types';

export const applyEffectsAll = (
  effectNames: string[],
  colors: HSVState[],
  luminaireId: string,
  numLightSources: number,
): HSVState[] => {
  return effectNames.reduce(
    (accumulatedColors: HSVState[], effectName, effectIndex) => {
      const effect = require(`../${effectName}`);

      return effect(
        accumulatedColors,
        luminaireId,
        numLightSources,
        effectIndex,
        effectNames.length,
      );
    },
    colors,
  );
};
