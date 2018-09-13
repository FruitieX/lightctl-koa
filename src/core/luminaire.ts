import * as Koa from 'koa';
import { ColourModes } from 'chromatism2';
import { applyEffectsAll, Effect } from './effect';
import { calculateTransitionProgress, getColorTransition } from '../utils';
import { Coordinate } from './room';

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

export type LuminaireConfig = {
  id: string;
  x?: number;
  y?: number;
  z?: number;
  end?: Coordinate;
  numLightSources?: number;
  brightness?: number;
  ignore?: boolean;
}[];

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

interface LuminaireOptions {
  brightness?: number;
  numLightSources?: number;
}

interface Options {
  luminaires: {
    [id: string]: LuminaireOptions;
  };
}

interface State {
  app?: Koa;
  luminaires: Luminaire[];
}

const state: State = {
  luminaires: [],
};

export const createLightSource = (
  // White by default
  initState: ColourModes.Any = { h: 0, s: 0, v: 100 },
): LightSource => ({
  oldState: initState,
  state: initState,
  newState: initState,
});

const findLuminaire = (id: string): Luminaire | undefined => {
  return state.luminaires.find(luminaire => luminaire.id === id);
};

export const findLuminaireIndex = (id: string): number => {
  return state.luminaires.findIndex(luminaire => luminaire.id === id);
};

/**
 * Creates and returns a new luminaire with all lights initially off
 */
const createLuminaire = (
  id: string,
  gateway: string,
  numLightSources: number,
  initState?: ColourModes.Any[],
): Luminaire => ({
  id,
  gateway,
  lightSources: [...Array(numLightSources)].map((_, i) =>
    createLightSource(initState && initState[i]),
  ),

  oldColors: [...(initState || [])],
  oldEffects: [],

  newColors: [...(initState || [])],
  newEffects: [],

  transitionTime: 0,
  transitionStart: new Date().getTime(),
});

/**
 * Register a new luminaire into state and notifies listeners about the
 * registration. Returns created luminaire.
 */
export const registerLuminaire = (
  id: string,
  gateway: string,
  numLightSources: number,
  initState?: ColourModes.Any[],
): Luminaire => {
  if (!state.app) throw new Error('Plugin not yet initialized');

  //const existingIndex = findLuminaireIndex(id);

  // if (existingIndex !== -1)
  // console.log(`Luminaire already exists with id '${id}', replacing...`);
  // throw new Error(`Luminaire already exists with id '${id}'`);

  //const luminaire = createLuminaire(id, gateway, numLightSources, initState);

  const luminaire = getLuminaire(id);
  luminaire.gateway = gateway;

  /*
  if (existingIndex !== -1) {
    state.luminaires[existingIndex] = luminaire;
  } else {
    state.luminaires.push(luminaire);
  }
  */

  state.app.emit('luminaireRegistered', luminaire);

  console.log(
    `Luminaire ${id} registered (${luminaire.lightSources.length} light${
      luminaire.lightSources.length === 1 ? '' : 's'
    }).`,
  );
  return luminaire;
};

/**
 * Returns true if luminaire with given id exists, false otherwise.
 */
export const luminaireExists = (id: string): boolean => !!findLuminaire(id);

/**
 * Resizes ColourModes.Any[] to target size
 * TODO: use a proper resampling method, like:
 * http://entropymine.com/imageworsener/resample/
 */
const resizeColors = (
  source: ColourModes.Any[],
  targetSize: number,
): ColourModes.Any[] => {
  // Already correct size, do nothing
  if (source.length === targetSize) return source;

  return [...Array(targetSize)].map(
    (_, i) => source[Math.floor((i / targetSize) * source.length)],
  );
};

const defaultColor = { h: 0, s: 0, v: 0 };

/**
 * Recalculates current light source color values based on luminaire colors,
 * effects and eventual transition.
 */
export const recalcLightSources = (luminaire: Luminaire) => {
  const progress = calculateTransitionProgress(
    luminaire.transitionStart,
    luminaire.transitionTime,
    new Date().getTime(),
  );

  let oldColors: ColourModes.Any[] = [defaultColor];
  let newColors: ColourModes.Any[] = [defaultColor];

  // Only calculate old colors if transition still ongoing
  if (progress !== 1) {
    oldColors = applyEffectsAll(
      luminaire.oldEffects,
      luminaire.oldColors,
      luminaire.id,
      luminaire.lightSources.length,
    );
  }

  newColors = applyEffectsAll(
    luminaire.newEffects,
    luminaire.newColors,
    luminaire.id,
    luminaire.lightSources.length,
  );

  const oldResized = resizeColors(oldColors, luminaire.lightSources.length);
  const newResized = resizeColors(newColors, luminaire.lightSources.length);

  // Calculate and set current colors based on transition time
  luminaire.lightSources = newResized.map((newColor = defaultColor, index) => {
    const oldColor = oldResized[index] || defaultColor;

    // Calculate transition between oldColor and newColor
    return {
      oldState: oldColor,
      state: getColorTransition(oldColor, newColor, progress),
      newState: newColor,
    };
  });
};

/**
 * Finds and returns luminaire by id. Throws error if luminaire not found.
 */
export const getLuminaire = (id: string): Luminaire => {
  const luminaire = findLuminaire(id);
  if (!luminaire) throw new Error(`Luminaire with id '${id}' not found`);

  recalcLightSources(luminaire);

  return luminaire;
};

/**
 * Returns a list of luminaire ID:s.
 */
export const getLuminaireIdList = (): string[] =>
  state.luminaires.map(luminaire => luminaire.id);

/**
 * Update luminaire by id. Returns luminaire with recalculated lightSource
 * colors (also emitted to listeners). Throws error if luminaire not found.
 */
const updateLuminaire = ({
  id,
  colors,
  effects,
  transitionTime = 500,
}: LuminaireUpdateFields): Luminaire => {
  if (!state.app) throw new Error('Plugin not yet initialized');

  const luminaire = findLuminaire(id);
  if (!luminaire) throw new Error(`Luminaire with id '${id}' not found`);

  luminaire.oldColors = luminaire.newColors;
  luminaire.oldEffects = luminaire.newEffects;

  luminaire.transitionTime = transitionTime;
  luminaire.transitionStart = new Date().getTime();

  luminaire.newColors = colors || [];
  luminaire.newEffects = effects || [];

  recalcLightSources(luminaire);

  return luminaire;
};

/**
 * Update multiple luminaires at once. Returns updated luminaires with
 * recalculated light source colors (also emitted to listeners all at once).
 * Throws error if any of the luminaires were not found.
 */
export const updateLuminaires = (
  fieldsList: LuminaireUpdateFields[],
): Luminaire[] => {
  if (!state.app) throw new Error('Plugin not yet initialized');

  const luminaires = fieldsList
    .filter(fields => luminaireExists(fields.id))
    .map(fields => updateLuminaire(fields));

  state.app.emit('luminairesUpdated', luminaires);
  return luminaires;
};

export const register = async (app: Koa, config: LuminaireConfig) => {
  state.app = app;

  app.on(
    'updateLuminaires',
    ({ fieldsList }: { fieldsList: LuminaireUpdateFields[] }) =>
      updateLuminaires(fieldsList),
  );

  config.forEach(luminaireConfig => {
    // Initial registration of all luminaires
    const luminaire = createLuminaire(
      luminaireConfig.id,
      'dummy',
      luminaireConfig.numLightSources || 1,
    );
    state.luminaires.push(luminaire);
  });
};
