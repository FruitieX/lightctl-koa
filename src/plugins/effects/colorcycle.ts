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
  const t = new Date().getTime();
  const interval = options.interval || 3; // how frequently (seconds) a color moves from light to next

  return colors.map((_, index) => {
    const offset =
      (t / 1000 / interval + luminaireIndex + index) % colors.length;

    const leftColor = colors[Math.floor(offset)];
    const rightColor = colors[Math.ceil(offset) % colors.length];

    const q = offset - Math.floor(offset);

    return getColorTransition(leftColor, rightColor, q);
  });
};
