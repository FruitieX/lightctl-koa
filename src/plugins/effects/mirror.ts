import { ColourModes } from 'chromatism2';
import { EffectOptions } from '../../types';
import { getColorTransition } from '../../utils';

export default (colors: ColourModes.Any[]): ColourModes.Any[] => {
  const reverse = [...colors].reverse();

  return [...colors, ...reverse];
};
