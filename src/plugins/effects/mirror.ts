import { HSVState, EffectOptions } from '../../types';
import { getColorTransition } from '../../utils';

export default (colors: HSVState[]): HSVState[] => {
  const reverse = [...colors].reverse();

  return [...colors, ...reverse];
};
