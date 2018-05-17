import { HSVState, EffectOptions } from '../../types';

interface State {
  luminairesToFade: string[];
}

const state: State = {
  luminairesToFade: [],
};

export default (
  colors: HSVState[],
  options: EffectOptions,
  luminaireIndex: number,
  luminaireId: string,
  numLightSources: number,
  effectIndex: number,
  numEffects: number,
): HSVState[] => {
  return colors;
};
