import { HSVState, EffectOptions, RGBState, StateType } from '../../types';
import { convertTo, getMsSinceMidnight, transitionValues } from '../../utils';
import { clamp } from 'ramda';

const night = 0.5;
const defaultBriAtHours = {
  0: night,
  1: night,
  2: night,
  3: night,
  4: night,
  5: night,
  6: night,
  7: 0.6,
  8: 0.7,
  9: 0.8,
  10: 0.9,
  /* missing values default to full brightness */
  20: 0.9,
  21: 0.8,
  22: 0.7,
  23: 0.6,
};

const state = {
  offset: 0,
  resetRate: 0.02, // Units per second
  adjustRate: 0, // Units per second
  adjusting: false,
};

setInterval(() => {
  if (state.offset > 0) {
    state.offset = Math.max(0, state.offset - state.resetRate);
  } else if (state.offset < 0) {
    state.offset = Math.min(0, state.offset + state.resetRate);
  }
}, 1000);

setInterval(() => {
  if (state.adjusting) {
    state.offset += state.adjustRate / 100;
    state.offset = clamp(-100, 100, state.offset);
  }
}, 10);

export const adjustBrightnessOffset = (delta: number) => {
  if (!delta) {
    state.adjusting = false;
  } else {
    state.adjusting = true;
    state.adjustRate = delta;
  }
};
export const setBrightnessOffset = (offset: number) => {
  state.offset = offset;
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
    v: clamp(0, 100, color.v * briShift + state.offset),
  }));
};
