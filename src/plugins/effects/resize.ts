import { HSVState, EffectOptions } from '../../types';
import { getColorTransition } from '../../utils';

export default (
  colors: HSVState[],
  options: EffectOptions,
  luminaireIndex: number,
  luminaireId: string,
  numLightSources: number,
  effectIndex: number,
  numEffects: number,
): HSVState[] => {
  // Array already at correct length, do nothing
  if (colors.length === numLightSources) return colors;

  return [...Array(numLightSources)].map((_, i) => {
    const pos = i / numLightSources * colors.length;
    const leftColor = colors[Math.floor(pos)];
    const rightColor = colors[Math.ceil(pos)] || colors[colors.length - 1];

    const transitionFactor = pos - Math.floor(pos);

    return getColorTransition(leftColor, rightColor, transitionFactor);
  });
};
