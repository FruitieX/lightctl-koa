import { ColourModes } from 'chromatism2';

// A light source, such as an RGB LED.
export interface LightSource {
  oldState: ColourModes.Any;
  state: ColourModes.Any; // state when transition started
  newState: ColourModes.Any;
  //transitionStart: number; // time when transition started
  //prevState: ColourModes.Any; // state when transition started

  //transitionEnd: number; // time when transition ends
  //nextState: ColourModes.Any; // reached at transitionEnd
}

// A light fixture, possibly containing multiple light sources
export interface Luminaire {
  id: string;
  gateway: string;
  lightSources: LightSource[];

  // old luminaire state (for transitions)
  oldColors: ColourModes.Any[];
  oldEffects: Effect[];

  // new (current) luminaire state
  newColors: ColourModes.Any[];
  newEffects: Effect[];

  transitionTime: number; // duration of transition in milliseconds
  transitionStart: number; // time when transition started
}

export interface LuminaireUpdateFields {
  id: string;
  colors: ColourModes.Any[];
  effects: Effect[];
  transitionTime?: number;
}

export interface SceneTarget {
  id: string;
  brightness?: number;

  // optional overrides
  effects?: Effect[];
  colors?: ColourModes.Any[];
}

export interface Scene {
  id: string;
  effects: Effect[];
  colors: ColourModes.Any[];
  targets: SceneTarget[];
}

export interface Group {
  id: string;
  luminaires: string[];
}

export interface EffectOptions {
  [key: string]: any;
}

export interface Effect {
  id: string;
  options: EffectOptions;
}
