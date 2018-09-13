import { ColourModes } from 'chromatism2';
import { EffectOptions } from '../../core/effect';

interface State {
  luminairesToFade: string[];
}

const state: State = {
  luminairesToFade: [],
};

export default (
  colors: ColourModes.Any[],
  options: EffectOptions,
  luminaireIndex: number,
  luminaireId: string,
  numLightSources: number,
  effectIndex: number,
  numEffects: number,
): ColourModes.Any[] => {
  return colors;
};
