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
  state: HSVState; // state when transition started
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
  oldEffects: string[];

  // new (current) luminaire state
  newColors: HSVState[];
  newEffects: string[];

  transitionTime: number; // duration of transition in milliseconds
  transitionStart: number; // time when transition started
}

export interface LuminaireUpdateFields {
  id: string;
  colors: HSVState[];
  effects: string[];
  transitionTime?: number;
}

export interface SceneTarget {
  id: string;
  brightness?: number;

  // optional overrides
  effects?: string[];
  colors?: AnyState[];
}

export interface Scene {
  id: string;
  effects: string[];
  colors: AnyState[];
  targets: SceneTarget[];
}

export interface Group {
  id: string;
  luminaires: string[];
}
