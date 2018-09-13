import { ColourModes } from 'chromatism2';

export default (colors: ColourModes.Any[]): ColourModes.Any[] => {
  const reverse = [...colors].reverse();

  return [...colors, ...reverse];
};
