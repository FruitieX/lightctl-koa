import * as Koa from 'koa';
import {
  luminaireExists,
  updateLuminaires,
  LuminaireUpdateFields,
  Luminaire,
  getLuminaireIdList,
} from './luminaire';
import { resetActiveScene } from './scene';

export interface Group {
  id: string;
  luminaires: string[];
}

export type GroupConfig = Group[];

type Groups = {
  [id: string]: Group;
};

interface State {
  app?: Koa;
  groups: Groups;
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

export const getGroups = (): Group[] => {
  return Object.values(state.groups);
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
    resetActiveScene();
    return updateLuminaires([fields]);
  } else if (groupExists(fields.id)) {
    // A group id match found, update all luminaires in group
    const group = getGroup(fields.id);
    const fieldsList = group.luminaires.map(luminaireId => ({
      ...fields,
      id: luminaireId,
    }));

    resetActiveScene();
    return updateLuminaires(fieldsList);
  } else {
    throw new Error(`No luminaire or group with id '${fields.id}' found.`);
  }
};

/**
 * Given an ID and a list of luminaireIds, creates a Group.
 *
 * @param id Group ID
 * @param luminaires List of luminaireIds
 */
export const createGroup = (id: string, luminaires: string[]): Group => ({
  id,
  luminaires,
});

/**
 * Adds a group to the state
 *
 * @param group Group to add to the state
 */
export const addGroup = (group: Group) => {
  console.log(`Adding group: ${group.id} (${group.luminaires.join(', ')})`);
  state.groups[group.id] = group;
};

export const register = async (app: Koa, config: GroupConfig) => {
  state.app = app;

  config.forEach(addGroup);
  addGroup(createGroup('All', getLuminaireIdList()));

  app.on('updateLuminaireOrGroup', (fields: LuminaireUpdateFields) =>
    updateLuminaireOrGroup(fields),
  );
};
