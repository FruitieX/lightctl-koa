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
  const t = new Date().getTime();
  const interval = options.interval || 3; // how frequently (seconds) a color moves from light to next

  return colors.map((_, index) => {
    const offset = (t / 1000 / interval + index) % colors.length;

    const leftColor = colors[Math.floor(offset)];
    const rightColor = colors[Math.ceil(offset) % colors.length];

    const q = offset - Math.floor(offset);

    return getColorTransition(leftColor, rightColor, q);
  });
};
