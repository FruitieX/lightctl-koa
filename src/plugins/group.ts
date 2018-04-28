import * as Koa from 'koa';
import { Group, Luminaire, HSVState, LuminaireUpdateFields } from '../types';
import {
  recalcLightSources,
  luminaireExists,
  updateLuminaires,
} from '../core/luminaire';

type Options = Group[];

interface State {
  app?: Koa;
  groups: {
    [id: string]: Group;
  };
}

const state: State = { groups: {} };

/**
 * Returns group
 * Throws if group not found
 */
export const getGroup = (id: string): Group => {
  const group = state.groups[id];
  if (!group) throw new Error(`Group with id '${id}' not found`);

  return group;
};

/**
 * Returns true if group with given id exists, false otherwise.
 */
export const groupExists = (id: string): boolean => !!state.groups[id];

/**
 * Given an id, tries to find either a luminaire or a group with matching id.
 * If luminaire matches, update only that luminaire. If group matches, update all
 * luminaires in that group.
 */
export const updateLuminaireOrGroup = (
  fields: LuminaireUpdateFields,
): Luminaire[] => {
  if (luminaireExists(fields.id)) {
    // A luminaire id match found, update only that luminaire
    return updateLuminaires([fields]);
  } else if (groupExists(fields.id)) {
    // A group id match found, update all luminaires in group
    const group = getGroup(fields.id);
    const fieldsList = group.luminaires.map(luminaireId => ({
      ...fields,
      id: luminaireId,
    }));

    return updateLuminaires(fieldsList);
  } else {
    throw new Error(`No luminaire or group with id '${fields.id}' found.`);
  }
};

/**
 * Returns group luminaires that have registered
 * Throws if group not found
 */
/*
export const getGroupLuminaires = (
  id: string,
  skipRecalc = false,
): string[] => {
  const group = getGroup(id);

  let luminaires = <Luminaire[]>group.luminaires.filter(
    groupLuminaire => typeof groupLuminaire !== 'string',
  );

  if (!skipRecalc) luminaires.forEach(recalcLightSources);

  return luminaires;
};
*/

/**
 * Calls updateLuminaire on each luminaire in group
 * Throws if group not found
 */
/*
export const updateGroupLuminaires = (
  id: string,
  colors: HSVState[],
  effects: string[],
  transitionTime?: number,
): Luminaire[] => {
  let luminaires = getGroupLuminaires(id, true);

  luminaires = luminaires.map(luminaire =>
    updateLuminaire(luminaire.id, colors, effects, transitionTime),
  );

  return luminaires;
};
*/

/**
 * Loops over each group in state, tries to add newly registered luminaire
 * to each group which luminaire has been configured in
 */
/*
const onLuminaireRegistered = (luminaire: Luminaire) => {
  state.groups.forEach(group => {
    group.luminaires = group.luminaires.map(groupLuminaire => {
      if (typeof groupLuminaire === 'string') {
        // Luminaire has not yet been registered, add to group
        if (groupLuminaire === luminaire.id) {
          return luminaire;
        }
      } else if (groupLuminaire.id === luminaire.id) {
        // Luminaire has already registered, replace it in group
        return luminaire;
      }

      // Keep previous value
      return groupLuminaire;
    });
  });
};
*/

export const register = async (app: Koa, options: Options) => {
  state.app = app;

  const groups: { [id: string]: Group } = {};
  options.forEach(group => (groups[group.id] = group));
  state.groups = groups;

  //app.on('luminaireRegistered', onLuminaireRegistered);
};
