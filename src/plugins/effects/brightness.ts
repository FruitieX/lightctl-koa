import { ColourModes, convert } from 'chromatism2';
import { clamp } from 'ramda';
import { getMsSinceMidnight, transitionValues } from '../../utils';
import { EffectOptions } from '../../core/effect';
import { forceUpdateAllLuminaires, getLuminaire } from '../../core/luminaire';

const night = 0.7;
const defaultBriAtHours = {
  0: night,
  1: night,
  2: night,
  3: night,
  4: night,
  5: night,
  6: night,
  7: 0.8,
  8: 0.9,
  /* missing values default to full brightness */
  22: 0.9,
  23: 0.8,
};

interface State {
  offset: number;
  resetRate: number;
  adjustRate: number;
  hitLowerBound: boolean;
  hitUpperBound: boolean;
  prevAdjustTime: number;
  adjusting: boolean;
  adjustInterval?: NodeJS.Timer;
}

const state: State = {
  offset: 0,
  resetRate: 0.001, // Units per second
  adjustRate: 0, // Units per second
  hitLowerBound: false,
  hitUpperBound: false,
  prevAdjustTime: 0,
  adjusting: false,
};

// Slowly reset adjustment back to default
setInterval(() => {
  if (state.offset > 0) {
    state.offset = Math.max(0, state.offset - state.resetRate);
  } else if (state.offset < 0) {
    state.offset = Math.min(0, state.offset + state.resetRate);
  }
}, 1000);

const doAdjustment = () => {
  if (state.adjustRate > 0 && state.hitUpperBound) return;
  if (state.adjustRate < 0 && state.hitLowerBound) return;
  state.offset += state.adjustRate;
  state.offset = clamp(-1, 1, state.offset);

  state.prevAdjustTime = new Date().getTime();
  forceUpdateAllLuminaires(1000);
};

export const adjustBrightnessOffset = (delta: number) => {
  if (!delta) {
    state.adjustInterval && clearInterval(state.adjustInterval);
    state.adjusting = false;

    // Roll back offset by remaining amount
    const dt = new Date().getTime() - state.prevAdjustTime;
    state.offset -= state.adjustRate * (1 - dt / 1000);

    forceUpdateAllLuminaires(100);
  } else {
    state.adjustInterval && clearInterval(state.adjustInterval);
    state.adjustRate = delta;
    state.adjusting = true;
    doAdjustment();
    state.adjustInterval = setInterval(doAdjustment, 1000);
  }
};
export const setBrightnessOffset = (offset: number) => {
  state.offset = offset;
  state.adjustInterval && clearInterval(state.adjustInterval);
  state.adjusting = false;

  forceUpdateAllLuminaires(100);
};

// TODO: let effect know about luminaire framerate so we can know what values to return from here
export default (
  colors: ColourModes.Any[],
  options: EffectOptions,
  _luminaireIndex: number,
  luminaireId: string,
): ColourModes.Any[] => {
  const briAtHours = options.briAtHours || defaultBriAtHours;
  const hour = getMsSinceMidnight() / 1000 / 60 / 60;
  const prevBri = briAtHours[Math.floor(hour)] || 1;
  const nextBri = briAtHours[Math.ceil(hour) % 24] || 1;

  const progress = hour - Math.floor(hour);
  const briShift = transitionValues(prevBri, nextBri, progress);

  const luminaire = getLuminaire(luminaireId, true);

  const frameTime = 1000 / luminaire.framerate;
  const dt = new Date().getTime() - state.prevAdjustTime + frameTime;
  const offset = state.adjusting
    ? state.offset - state.adjustRate * (1 - dt / 1000)
    : state.offset;

  const retval = colors.map(color => {
    color = convert(color).hsv;

    return {
      ...color,
      v: color.v < 1 ? 0 : clamp(1, 100, color.v * briShift + color.v * offset),
    };
  });

  let minVal = Infinity;
  retval.forEach(color => (minVal = Math.min(minVal, color.v)));

  let maxVal = -Infinity;
  retval.forEach(color => (maxVal = Math.max(maxVal, color.v)));

  if (minVal <= 1) state.hitLowerBound = true;
  else state.hitLowerBound = false;

  if (maxVal >= 100) state.hitUpperBound = true;
  else state.hitUpperBound = false;
  /*
  if (maxVal <= 1) state.hitLowerBound = true;
  else state.hitLowerBound = false;

  if (minVal >= 100) state.hitUpperBound = true;
  else state.hitUpperBound = false;
  */

  return retval;
};
