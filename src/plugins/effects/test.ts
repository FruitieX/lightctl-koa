import { ColourModes } from 'chromatism2';
import { EffectOptions } from '../../types';

export default (
  colors: ColourModes.Any[],
  options: EffectOptions,
  luminaireIndex: number,
  luminaireId: string,
  numLightSources: number,
): ColourModes.Any[] => {
  let output = [...Array(numLightSources)].map(() => ({
    r: 0,
    g: 0,
    b: 0,
  }));

  const rate = options.rate || 10;

  const index = (Math.floor(new Date().getTime() / 1000 * rate)) % numLightSources;

  if (index === 0) {
    output[index] = { r: 255, g: 0, b: 0 };
  } else if (index === numLightSources - 1) {
    output[index] = { r: 0, g: 0, b: 255 };
  } else {
    output[index] = { r: 255, g: 255, b: 255 };
  }

  return output;
};
