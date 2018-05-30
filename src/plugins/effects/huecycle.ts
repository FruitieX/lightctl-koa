import { convert, ColourModes } from 'chromatism2';
import { EffectOptions } from '../../types';
import { getColorTransition } from '../../utils';

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
  const rate = options.rate || 50;

  return colors.map((color, index) => {
    const offset =
      (t / 1000 * rate);

    const hsv = { ...convert(color).hsv };

    hsv.h = (hsv.h + offset) % 360;

    return hsv;
  });
};
