import {
  HSVState,
  LightSource,
  Luminaire,
  LuminaireUpdateFields,
} from '../types';
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
  //if (state.luminaires[id])
  //throw new Error(`Luminaire already exists with id '${id}'`);

  const luminaire = createLuminaire(id, gateway, numLightSources);
  state.luminaires[id] = luminaire;

  // TODO: this is not a deep copy
  const copy = { ...luminaire };
  state.app.emit('luminaireRegistered', copy);

  console.log('Luminaire', id, 'registered.');
  return copy;
};

/**
 * Returns true if luminaire with given id exists, false otherwise.
 */
export const luminaireExists = (id: string): boolean => !!state.luminaires[id];

/**
 * Resizes HSVState[] to target size
 * TODO: use a proper resampling method, like:
 * http://entropymine.com/imageworsener/resample/
 */
const resizeColors = (source: HSVState[], targetSize: number): HSVState[] => {
  // Already correct size, do nothing
  if (source.length === targetSize) return source;

  return [...Array(targetSize)].map(
    (_, i) => source[Math.floor(i / targetSize * source.length)],
  );
};

const defaultColor: HSVState = { h: 0, s: 0, v: 0 };

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
const updateLuminaire = ({
  id,
  colors,
  effects,
  transitionTime = 500,
}: LuminaireUpdateFields): Luminaire => {
  if (!state.app) throw new Error('Plugin not yet initialized');

  const luminaire = state.luminaires[id];
  if (!luminaire) throw new Error(`Luminaire with id '${id}' not found`);

  luminaire.oldColors = luminaire.newColors;
  luminaire.oldEffects = luminaire.newEffects;

  luminaire.transitionTime = transitionTime;
  luminaire.transitionStart = new Date().getTime();

  luminaire.newColors = colors || [];
  luminaire.newEffects = effects || [];

  recalcLightSources(luminaire);

  // TODO: this is not a deep copy
  const copy = { ...luminaire };
  //state.app.emit('luminairesUpdated', [copy]);
  return copy;
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

export const register = async (app: Koa, options: Options) => {
  state.app = app;

  app.on(
    'updateLuminaires',
    ({ fieldsList }: { fieldsList: LuminaireUpdateFields[] }) =>
      updateLuminaires(fieldsList),
  );
};
