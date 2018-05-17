import { AnyState, StateType, HSVState, RGBState, CTState } from './types';

import * as cc from 'color-convert';
import { clamp } from 'ramda';
import { convert } from 'chromatism2';

export const convertTo = (orig: AnyState, to: StateType): AnyState => {
  let from: StateType = StateType.HSV;
  let arr: [number, number, number] = [0, 0, 100];

  // TODO: this is janky af, but there's no better way right?
  if (!isNaN((<HSVState>orig).h)) {
    const hsv = <HSVState>orig;
    from = StateType.HSV;
    arr = [hsv.h, hsv.s, hsv.v];
  } else if (!isNaN((<RGBState>orig).r)) {
    const rgb = <RGBState>orig;
    from = StateType.RGB;
    arr = [rgb.r, rgb.g, rgb.b];
  } else if (!isNaN((<CTState>orig).c)) {
    const ct = <CTState>orig;
    from = StateType.CT;
    arr = [ct.c, ct.t, 0];
  }

  if (from === to) {
    return orig;
  }

  // @ts-ignore
  const converted = cc[from][to].raw(arr);

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
  progress = clamp(0, 1, progress);
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

  // Do transition in CIELAB color space

  const oldLab = convert(oldColor).cielab;
  const newLab = convert(newColor).cielab;

  const curLab = {
    L: transitionValues(oldLab.L, newLab.L, progress),
    a: transitionValues(oldLab.a, newLab.a, progress),
    b: transitionValues(oldLab.b, newLab.b, progress),
  };

  return convert(curLab).hsv;

  /*
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
  */
};

export const getMsSinceMidnight = (): number => {
  const d = new Date();
  const e = new Date(d);
  e.setHours(0, 0, 0, 0);
  return d.getTime() - e.getTime();
};
