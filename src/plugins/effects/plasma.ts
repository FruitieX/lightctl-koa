import { ColourModes } from 'chromatism2';
import { EffectOptions } from '../../types';
import { convert } from 'chromatism2';

const calcPlasma = (x: number, y = 1, timeOffset = 0, rate = 1, b = 4) => {
  const t = (new Date().getTime() / 1000 + timeOffset * 1000) * rate;

  // horizontal sinusoid
  const sine1 = Math.sin(x * 10 + t * 2);

  // rotating sinusoid
  const sine2 = Math.sin(10 * (x * Math.sin(t / 2) + y * Math.cos(t / 3)) + t);

  // circular sinusoid
  const cx = x + 0.5 * Math.sin(t / 5);
  const cy = y + 0.5 * Math.cos(t / 3);
  const sine3 = Math.sin(Math.sqrt(100 * (cx * cx + cy * cy) + 1) + t);

  let blend = sine1 + sine2 + sine3;
  //blend *= 1 + 0.5 + Math.sin(t) / 2;
  blend *= b;

  // constrain to [0, 1]
  blend = Math.sin(blend * Math.PI / 2) / 2 + 0.5;

  return blend;
};

export default (
  colors: ColourModes.Any[],
  options: EffectOptions,
  luminaireIndex: number,
  luminaireId: string,
  numLightSources: number,
  effectIndex: number,
  numEffects: number,
): ColourModes.Any[] => {
  let output = [...Array(numLightSources)].map(() => ({
    r: 0,
    g: 0,
    b: 0,
  }));

  const rate = options.rate || 0.2;
  const scale = options.scale || 2;
  const blend = options.blend || 4;

  colors.forEach((color, colorIndex) => {
    const rgb = convert(color).rgb;

    output = output.map((out, outIndex) => {
      const plasma = calcPlasma(((outIndex / numLightSources) * 2 - 1) / scale, 0, colorIndex, rate, blend);

      return {
        r: out.r + rgb.r * plasma,
        g: out.g + rgb.g * plasma,
        b: out.b + rgb.b * plasma,
      }
    });
  });

  return output;
};
