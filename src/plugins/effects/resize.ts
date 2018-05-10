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
  luminaireId: string,
  numLightSources: number,
  effectIndex: number,
  numEffects: number,
): HSVState[] => {
  return [...Array(numLightSources)].map(l => colors[0]);
};
