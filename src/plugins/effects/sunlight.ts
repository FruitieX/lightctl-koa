import { HSVState, EffectOptions, RGBState, StateType } from '../../types';
import { convertTo, getMsSinceMidnight, transitionValues } from '../../utils';
import { clamp } from 'ramda';
import { convert } from 'chromatism2';

const night = 0.85;
const day = -0.05;
const defaultTempAtHours = {
  0: night,
  1: night,
  2: night,
  3: night,
  4: night,
  5: night,
  6: night,
  7: 0.6,
  8: 0.4,
  9: 0.1,
  10: 0,
  11: day,
  12: day,
  13: day,
  14: day,
  15: day,
  16: day,
  17: day,
  18: 0.2,
  19: 0.4,
  20: 0.5,
  21: 0.6,
  22: 0.7,
  23: night,
};

const startTime = new Date().getTime();

export default (colors: HSVState[], options: EffectOptions): HSVState[] => {
  const tempAtHours = options.tempAtHours || defaultTempAtHours;
  const hour = getMsSinceMidnight() / 1000 / 60 / 60;
  const prevTemp = tempAtHours[Math.floor(hour)] || 0;
  const nextTemp = tempAtHours[Math.ceil(hour) % 24] || 0;

  const progress = hour - Math.floor(hour);
  let tempShift = transitionValues(prevTemp, nextTemp, progress);

  if (tempShift)
    tempShift = tempShift / Math.abs(tempShift) * Math.abs(tempShift) ** 1.5;

  return colors.map(color => {
    const lab = convert(color).cielab;

    // Set lightness to 50 for all lights, otherwise lights
    // get colored by different amounts depending on HSV.v
    // FIXME: this is not exactly correct and will mess up
    // some colors
    lab.L = 50;
    lab.a += tempShift ** 2 * 100;
    if (tempShift)
      lab.b +=
        tempShift / Math.abs(tempShift) * Math.abs(tempShift) ** (1 / 2) * 100;

    return { ...convert(lab).hsv, v: color.v };
  });
};
