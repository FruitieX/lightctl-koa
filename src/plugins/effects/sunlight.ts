import { HSVState, EffectOptions, RGBState, StateType } from '../../types';
import { convertTo, getMsSinceMidnight, transitionValues } from '../../utils';
import { clamp } from 'ramda';
import { convert } from 'chromatism';

const night = 80;
const defaultTempAtHours = {
  0: night,
  1: night,
  2: night,
  3: night,
  4: night,
  5: night,
  6: night,
  7: night,
  8: 60,
  9: 40,
  10: 20,
  /* missing values default to no temperature adjustment */
  19: 20,
  20: 40,
  21: 60,
  23: night,
};

export default (colors: HSVState[], options: EffectOptions): HSVState[] => {
  const tempAtHours = options.tempAtHours || defaultTempAtHours;
  const hour = getMsSinceMidnight() / 1000 / 60 / 60;
  const prevTemp = tempAtHours[Math.floor(hour)] || 0;
  const nextTemp = tempAtHours[Math.ceil(hour) % 24] || 0;

  const progress = hour - Math.floor(hour);
  const tempShift = transitionValues(prevTemp, nextTemp, progress);

  return colors.map(color => {
    const lab = convert(color).cielab;

    lab.a += tempShift;
    lab.b += tempShift;

    return convert(color).hsv;
  });
};
