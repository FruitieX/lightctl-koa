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
  transitionStart: number; // time when transition started
  prevState: HSVState; // state when transition started

  transitionEnd: number; // time when transition ends
  nextState: HSVState; // reached at transitionEnd
}

// A light fixture, possibly containing multiple light sources
export interface Luminaire {
  id: string;
  gateway: string;
  lightSources: LightSource[];

  colors: HSVState[];
  effects: string[];
}

export interface SceneCmd {
  target: string;
  type: StateType;
  transitionTime?: number;
  useExistingTransition?: boolean;
  state: HSVState | RGBState | CTState;
}

export interface Scene {
  name: string;
  cmds: SceneCmd[];
}

export interface Group {
  name: string;
  luminaires: Luminaire[];
}
