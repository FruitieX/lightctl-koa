import { convert, ColourModes } from 'chromatism2';

import { clamp } from 'ramda';

export const calculateTransitionProgress = (
  start: number,
  duration: number,
  curTime: number,
): number => {
  if (!duration) {
    return 1;
  }

  const progress = (curTime - start) / duration;

  // Bounded to [0, 1]
  return Math.max(0, Math.min(progress, 1));
};

export const transitionValues = (
  oldValue: number,
  newValue: number,
  progress: number,
): number => {
  progress = clamp(0, 1, progress);
  return oldValue * (1 - progress) + newValue * progress;
};

export const getColorTransition = (
  oldColor: ColourModes.Any,
  newColor: ColourModes.Any,
  progress: number,
): ColourModes.Any => {
  // Directly return oldColor/newColor for 0/1 progress
  if (progress === 0) {
    return oldColor;
  } else if (progress === 1) {
    return newColor;
  }

  // Do transition in CIELAB color space
  // https://howaboutanorange.com/blog/2011/08/10/color_interpolation/

  const oldLab = convert(oldColor).cielab;
  const newLab = convert(newColor).cielab;

  const curLab = {
    L: transitionValues(oldLab.L, newLab.L, progress),
    a: transitionValues(oldLab.a, newLab.a, progress),
    b: transitionValues(oldLab.b, newLab.b, progress),
  };

  return convert(curLab).hsv;
};

export const getMsSinceMidnight = (): number => {
  const d = new Date();
  const e = new Date(d);
  e.setHours(0, 0, 0, 0);
  return d.getTime() - e.getTime();
};
