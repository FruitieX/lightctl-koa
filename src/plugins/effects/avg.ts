import { ColourModes, convert } from 'chromatism2';

export default (colors: ColourModes.Any[]): ColourModes.Any[] => {
  const rgbColors = colors.map(color => convert(color).rgb);

  const color = rgbColors.reduce((prev, cur) => {
    return {
      r: prev.r + cur.r,
      g: prev.g + cur.g,
      b: prev.b + cur.b,
    };
  });

  color.r /= rgbColors.length;
  color.g /= rgbColors.length;
  color.b /= rgbColors.length;

  return [color];
};
