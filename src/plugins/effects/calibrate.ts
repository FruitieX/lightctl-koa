import { ColourModes, convert } from 'chromatism2';
import { EffectOptions } from '../../core/effect';

interface Calibration {
  id: string;
  cielab?: (color: ColourModes.CIELAB) => ColourModes.Any;
}

export default (
  colors: ColourModes.Any[],
  options: EffectOptions,
  _luminaireIndex: number,
  luminaireId: string,
): ColourModes.Any[] => {
  const calibrations: Calibration[] = options.luminaires;
  const luminaireCalibration = calibrations.find(
    calibration => calibration.id === luminaireId,
  );

  if (!luminaireCalibration) return colors;

  return colors.map(color => {
    if (luminaireCalibration.cielab) {
      return luminaireCalibration.cielab(convert(color).cielab);
    }

    return color;
  });
};
