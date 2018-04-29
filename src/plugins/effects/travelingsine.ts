import { HSVState, EffectOptions } from '../../types';

const calcBrightness = (
  speed: number,
  spread: number,
  index: number,
): number => {
  const t = new Date().getTime();

  return Math.sin(t / 1000 * speed + index * spread) / 2 + 0.5;
};

export default (colors: HSVState[], options: EffectOptions): HSVState[] => {
  const speed = isNaN(options.speed) ? 3 : options.speed;
  const spread = isNaN(options.spread) ? 5 : options.spread;

  return colors.map((color, index) => {
    return { ...color, v: color.v * calcBrightness(speed, spread, index) };
  });
};
