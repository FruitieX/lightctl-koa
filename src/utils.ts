import { AnyState, StateType, HSVState, RGBState, CTState } from './types';

import * as convert from 'color-convert';

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
