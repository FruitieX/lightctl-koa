import { HSVState, LightSource, RGBState, StateType } from '../types';
import { convertTo } from '../utils';

// White in HSV
export const defaultState: HSVState = {
  h: 0,
  s: 0,
  v: 100,
};

export const createLightSource = (initState = defaultState): LightSource => ({
  state: initState,
});
