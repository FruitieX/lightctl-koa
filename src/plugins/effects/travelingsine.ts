import { ColourModes, convert } from 'chromatism2';
import { EffectOptions } from '../../types';

const calcBrightness = (
  speed: number,
  spread: number,
  index: number,
): number => {
  const t = new Date().getTime();

  return Math.sin(t / 1000 * speed + index * spread) / 2 + 0.5;
};

export default (
  colors: ColourModes.Any[],
  options: EffectOptions,
): ColourModes.Any[] => {
  const speed = isNaN(options.speed) ? 3 : options.speed;
  const spread = isNaN(options.spread) ? 5 : options.spread;

  return colors.map((color, index) => {
    const hsv = convert(color).hsv;
    return { ...hsv, v: hsv.v * calcBrightness(speed, spread, index) };
  });
};
