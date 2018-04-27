import { HSVState, LightSource, Luminaire } from '../types';
import { createLightSource } from './lightsource';
import * as Koa from 'koa';
import { applyEffectsAll } from './effect';
import { calculateTransitionProgress, getColorTransition } from '../utils';

interface Options {}

interface State {
  app?: Koa;
  luminaires: {
    [id: string]: Luminaire;
  };
}

const state: State = {
  luminaires: {},
};

/**
 * Creates and returns a new luminaire with all lights initially off
 */
const createLuminaire = (
  id: string,
  gateway: string,
  numLightSources: number,
): Luminaire => ({
  id,
  gateway,
  lightSources: [...Array(numLightSources)].map(createLightSource),

  oldColors: [],
  oldEffects: [],

  newColors: [],
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
): Luminaire => {
  if (!state.app) throw new Error('Plugin not yet initialized');
  if (state.luminaires[id])
    throw new Error(`Luminaire already exists with id '${id}'`);

  const luminaire = createLuminaire(id, gateway, numLightSources);
  state.luminaires[id] = luminaire;

  // TODO: this is not a deep copy
  const copy = { ...luminaire };
  state.app.emit('luminaireRegistered', copy);
  return copy;
};

/**
 * Recalculates current light source color values based on luminaire colors,
 * effects and eventual transition.
 */
export const recalcLightSources = (luminaire: Luminaire) => {
  const oldColors = applyEffectsAll(
    luminaire.oldEffects,
    luminaire.oldColors,
    luminaire.id,
    luminaire.lightSources.length,
  );
  const newColors = applyEffectsAll(
    luminaire.newEffects,
    luminaire.newColors,
    luminaire.id,
    luminaire.lightSources.length,
  );

  const progress = calculateTransitionProgress(
    luminaire.transitionStart,
    luminaire.transitionTime,
    new Date().getTime(),
  );

  // Calculate current colors based on transition time
  // FIXME this is broken because we CANNOT assume newColor.length ===
  // oldColor.length!
  const curColors = newColors.map((newColor, index) => {
    const oldColor = oldColors[index];

    // Calculate transition between oldColor and newColor
    return getColorTransition(oldColor, newColor, progress);
  });

  // Spread colors evenly to luminaire's lightSources
  // TODO: what if numCol > numLs?
  const numLs = luminaire.lightSources.length;
  const numCol = curColors.length;

  luminaire.lightSources = luminaire.lightSources.map((lightSource, index) => {
    const colIndex = index / (numLs - 1) * (numCol - 1);
    const leftColor = curColors[Math.floor(colIndex)];
    const rightColor = curColors[Math.ceil(colIndex)];

    const q = colIndex - Math.floor(colIndex);
    return { state: getColorTransition(leftColor, rightColor, q) };
  });
};

/**
 * Finds and returns luminaire by id. Throws error if luminaire not found.
 */
export const getLuminaire = (id: string): Luminaire => {
  const luminaire = state.luminaires[id];
  if (!luminaire) throw new Error(`Luminaire with id '${id}' not found`);

  recalcLightSources(luminaire);

  // TODO: this is not a deep copy
  const copy = { ...luminaire };
  return copy;
};

/**
 * Update luminaire by id. Returns luminaire with recalculated lightSource
 * colors (also emitted to listeners). Throws error if luminaire not found.
 */
export const updateLuminaire = (
  id: string,
  colors: HSVState[],
  effects: string[],
  transitionTime = 500,
): Luminaire => {
  if (!state.app) throw new Error('Plugin not yet initialized');

  const luminaire = state.luminaires[id];
  if (!luminaire) throw new Error(`Luminaire with id '${id}' not found`);

  luminaire.oldColors = luminaire.newColors;
  luminaire.oldEffects = luminaire.newEffects;

  luminaire.transitionTime = transitionTime;
  luminaire.transitionStart = new Date().getTime();

  luminaire.newColors = colors;
  luminaire.newEffects = effects;

  recalcLightSources(luminaire);

  // TODO: this is not a deep copy
  const copy = { ...luminaire };
  state.app.emit('luminaireUpdated', copy);
  return copy;
};

export const register = async (app: Koa, options: Options) => {
  state.app = app;
};
