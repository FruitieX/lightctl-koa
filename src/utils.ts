import { AnyState, StateType, HSVState, RGBState, CTState } from './types';

import * as convert from 'color-convert';
import { clamp } from 'ramda';

export const convertTo = (orig: AnyState, to: StateType): AnyState => {
  let from: StateType = StateType.HSV;
  let arr: [number, number, number] = [0, 0, 100];

  // TODO: this is janky af, but there's no better way right?
  if ((<HSVState>orig).h) {
    const hsv = <HSVState>orig;
    from = StateType.HSV;
    arr = [hsv.h, hsv.s, hsv.v];
  } else if ((<RGBState>orig).r) {
    const rgb = <RGBState>orig;
    from = StateType.RGB;
    arr = [rgb.r, rgb.g, rgb.b];
  } else if ((<CTState>orig).c) {
    const ct = <CTState>orig;
    from = StateType.CT;
    arr = [ct.c, ct.t, 0];
  }

  // @ts-ignore
  const converted = convert[from][to].raw(arr);

  if (to === StateType.HSV) {
    return <HSVState>{
      h: converted[0],
      s: converted[1],
      v: converted[2],
    };
  } else if (to === StateType.RGB) {
    return <RGBState>{
      r: converted[0],
      g: converted[1],
      b: converted[2],
    };
  } else {
    /*if (to === StateType.CT)*/
    return <CTState>{
      c: converted[0],
      t: converted[1],
    };
  }
};

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
  progress = clamp(progress, 0, 1);
  return oldValue * (1 - progress) + newValue * progress;
};

export const getColorTransition = (
  oldColor: HSVState,
  newColor: HSVState,
  progress: number,
): HSVState => {
  // Directly return oldColor/newColor for 0/1 progress
  if (progress === 0) {
    return oldColor;
  } else if (progress === 1) {
    return newColor;
  }

  // Convert HSV to RGB as HSV is unsuitable for transitions
  const oldRgb = <RGBState>convertTo(oldColor, StateType.RGB);
  const newRgb = <RGBState>convertTo(newColor, StateType.RGB);

  // Perform the transition in RGB color space
  const curRgb: RGBState = {
    r: transitionValues(oldRgb.r, newRgb.r, progress),
    g: transitionValues(oldRgb.g, newRgb.g, progress),
    b: transitionValues(oldRgb.b, newRgb.b, progress),
  };

  // Convert RGB back to HSV then return result
  return <HSVState>convertTo(curRgb, StateType.HSV);
};

export const getMsSinceMidnight = (): number => {
  const d = new Date();
  const e = new Date(d);
  e.setHours(0, 0, 0, 0);
  return d.getTime() - e.getTime();
};
