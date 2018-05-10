import { HSVState, EffectOptions, RGBState, StateType } from '../../types';
import { convertTo, getMsSinceMidnight, transitionValues } from '../../utils';
import { clamp } from 'ramda';

const night = 0.2;
const defaultBriAtHours = {
  0: night,
  1: night,
  2: night,
  3: night,
  4: night,
  5: night,
  6: night,
  7: night,
  8: 0.5,
  9: 0.75,
  /* missing values default to full brightness */
  19: 0.8,
  20: 0.6,
  21: 0.5,
  22: 0.3,
  23: 0.25,
};

export default (colors: HSVState[], options: EffectOptions): HSVState[] => {
  const briAtHours = options.briAtHours || defaultBriAtHours;
  const hour = getMsSinceMidnight() / 1000 / 60 / 60;
  const prevBri = briAtHours[Math.floor(hour)] || 1;
  const nextBri = briAtHours[Math.ceil(hour) % 24] || 1;

  const progress = hour - Math.floor(hour);
  const briShift = transitionValues(prevBri, nextBri, progress);

  return colors.map(color => ({
    ...color,
    v: color.v * briShift,
  }));
};
