import { LightSource } from '../types';
import { ColourModes } from 'chromatism2';

// White in HSV
export const defaultState = {
  h: 0,
  s: 0,
  v: 100,
};

export const createLightSource = (
  initState: ColourModes.Any = defaultState,
): LightSource => ({
  oldState: initState,
  state: initState,
  newState: initState,
});
