export interface HSVState {
  h: number;
  s: number;
  v: number;
}

export interface RGBState {
  r: number;
  g: number;
  b: number;
}

export interface CTState {
  c: number;
  t: number;
}

export type AnyState = HSVState | RGBState | CTState;

export enum StateType {
  CT = 'ct',
  HSV = 'hsv',
  RGB = 'rgb',
}

// A light source, such as an RGB LED.
export interface LightSource {
  oldState: HSVState;
  state: HSVState; // state when transition started
  newState: HSVState;
  //transitionStart: number; // time when transition started
  //prevState: HSVState; // state when transition started

  //transitionEnd: number; // time when transition ends
  //nextState: HSVState; // reached at transitionEnd
}

// A light fixture, possibly containing multiple light sources
export interface Luminaire {
  id: string;
  gateway: string;
  lightSources: LightSource[];

  // old luminaire state (for transitions)
  oldColors: HSVState[];
  oldEffects: Effect[];

  // new (current) luminaire state
  newColors: HSVState[];
  newEffects: Effect[];

  transitionTime: number; // duration of transition in milliseconds
  transitionStart: number; // time when transition started
}

export interface LuminaireUpdateFields {
  id: string;
  colors: HSVState[];
  effects: Effect[];
  transitionTime?: number;
}

export interface SceneTarget {
  id: string;
  brightness?: number;

  // optional overrides
  effects?: Effect[];
  colors?: AnyState[];
}

export interface Scene {
  id: string;
  effects: Effect[];
  colors: AnyState[];
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
