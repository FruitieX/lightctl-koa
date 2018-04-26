import { HSVState, LightSource, RGBState, StateType } from '../../types';
import { convertTo } from '../../utils';

// White in HSV
export const defaultState: HSVState = {
  h: 0,
  s: 0,
  v: 100,
};

export const createLightSource = (initState = defaultState): LightSource => ({
  transitionStart: 0,
  prevState: initState,

  transitionEnd: 0,
  nextState: initState,
});

const calculateTransitionProgress = (start: number, end: number): number => {
  if (start === end) {
    return 1;
  }

  const q = (new Date().getTime() - start) / (end - start);

  // Bounded to [0, 1]
  return Math.max(0, Math.min(q, 1));
};

export const getCurrentState = (source: LightSource): HSVState => {
  const q = calculateTransitionProgress(
    source.transitionStart,
    source.transitionEnd,
  );

  const prevRgb: RGBState = <RGBState>convertTo(
    source.prevState,
    StateType.RGB,
  );
  const nextRgb: RGBState = <RGBState>convertTo(
    source.nextState,
    StateType.RGB,
  );

  const currentRgb: RGBState = {
    r: prevRgb.r * (1 - q) + nextRgb.r * q,
    g: prevRgb.g * (1 - q) + nextRgb.g * q,
    b: prevRgb.b * (1 - q) + nextRgb.b * q,
  };

  const currentState = <HSVState>convertTo(currentRgb, StateType.HSV);

  return currentState;
};
