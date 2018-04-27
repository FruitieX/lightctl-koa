import * as Koa from 'koa';
import { Group, Luminaire, HSVState } from '../types';
import { recalcLightSources, updateLuminaire } from '../core/luminaire';

type Options = Group[];

interface State {
  app?: Koa;
  groups: Group[];
}

const state: State = {
  groups: [],
};

/**
 * Returns group
 * Throws if group not found
 */
export const getGroup = (id: string): Group => {
  const group = state.groups.find(group => group.id === id);
  if (!group) throw new Error(`Group with id '${id}' not found`);

  return group;
};

/**
 * Returns group luminaires that have registered
 * Throws if group not found
 */
export const getGroupLuminaires = (
  id: string,
  skipRecalc = false,
): Luminaire[] => {
  const group = getGroup(id);

  let luminaires = <Luminaire[]>group.luminaires.filter(
    groupLuminaire => typeof groupLuminaire !== 'string',
  );

  if (!skipRecalc) luminaires.forEach(recalcLightSources);

  return luminaires;
};

/**
 * Calls updateLuminaire on each luminaire in group
 * Throws if group not found
 */
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

/**
 * Loops over each group in state, tries to add newly registered luminaire
 * to each group which luminaire has been configured in
 */
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

export const register = async (app: Koa, options: Options) => {
  state.app = app;
  state.groups = options;

  app.on('luminaireRegistered', onLuminaireRegistered);
};
