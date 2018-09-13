import { ColourModes } from 'chromatism2';
import { getColorTransition } from '../../utils';
import { EffectOptions } from '../../core/effect';

export default (
  colors: ColourModes.Any[],
  options: EffectOptions,
  luminaireIndex: number,
  luminaireId: string,
  numLightSources: number,
  effectIndex: number,
  numEffects: number,
): ColourModes.Any[] => {
  // Array already at correct length, do nothing
  if (colors.length === numLightSources) return colors;

  return [...Array(numLightSources)].map((_, i) => {
    const pos = (i / numLightSources) * colors.length;
    const leftColor = colors[Math.floor(pos)];
    const rightColor = colors[Math.ceil(pos)] || colors[colors.length - 1];

    const transitionFactor = pos - Math.floor(pos);

    return getColorTransition(leftColor, rightColor, transitionFactor);
  });
};
