import { HSVState, StateType, RGBState } from '../../types';
import { convertTo } from '../../utils';

export default (colors: HSVState[]): HSVState[] => {
  const rgbColors = <RGBState[]>colors.map(color =>
    convertTo(color, StateType.RGB),
  );

  const color = rgbColors.reduce((prev, cur) => {
    return <RGBState>{
      r: prev.r + cur.r,
      g: prev.g + cur.g,
      b: prev.b + cur.b,
    };
  });

  color.r /= rgbColors.length;
  color.g /= rgbColors.length;
  color.b /= rgbColors.length;

  return [<HSVState>convertTo(color, StateType.HSV)];
};
