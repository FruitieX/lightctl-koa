import { HSVState, EffectOptions, RGBState, StateType } from '../../types';
import { convertTo, getMsSinceMidnight, transitionValues } from '../../utils';
import { clamp } from 'ramda';

const night = 20;
const defaultTempAtHours = {
  0: night,
  1: night,
  2: night,
  3: night,
  4: night,
  5: night,
  6: night,
  7: night,
  8: 15,
  9: 10,
  10: 5,
  /* missing values default to no temperature adjustment */
  19: 5,
  20: 10,
  21: 15,
  23: night,
};

export default (colors: HSVState[], options: EffectOptions): HSVState[] => {
  const tempAtHours = options.tempAtHours || defaultTempAtHours;
  const hour = getMsSinceMidnight() / 1000 / 60 / 60;
  const prevTemp = options.tempAtHours[Math.floor(hour)] || 0;
  const nextTemp = options.tempAtHours[Math.ceil(hour) % 24] || 0;

  const progress = hour - Math.floor(hour);
  const tempShift = transitionValues(prevTemp, nextTemp, progress);

  return colors.map(color => {
    const rgb = <RGBState>convertTo(color, StateType.RGB);

    // http://www.tannerhelland.com/5675/simple-algorithms-adjusting-image-temperature-tint/
    rgb.r = clamp(rgb.r + tempShift, 0, 255);
    rgb.b = clamp(rgb.b - tempShift, 0, 255);

    return <HSVState>convertTo(rgb, StateType.HSV);
  });
};
