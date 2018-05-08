import * as Koa from 'koa';
import { Scene, LuminaireUpdateFields, StateType, HSVState } from '../types';
import { updateLuminaires } from '../core/luminaire';
import { convertTo } from '../utils';
import { groupExists, getGroup } from './group';
import { flatten } from 'ramda';

type Options = Scene[];

interface State {
  app?: Koa;
  scenes: Scene[];
  activeScene?: Scene;
}

const state: State = { scenes: [] };

/**
 * Activates a scene by id. Throws if scene not found.
 */
const activateScene = (id: string) => {
  const scene = state.scenes.find(scene => scene.id === id);

  if (!scene) throw new Error(`Scene with id '${id}' not found`);

  state.activeScene = scene;

  // TODO: get rid of janky type assertions
  const fieldsList = <LuminaireUpdateFields[]>flatten(
    scene.targets.map(target => {
      const brightness =
        target.brightness === undefined ? 1 : target.brightness;

      const colors = (target.colors || scene.colors)
        .map(color => <HSVState>convertTo(color, StateType.HSV))
        .map(color => ({ ...color, v: color.v * brightness }));

      const effects = target.effects || scene.effects;

      let fields = {
        id: target.id,
        colors,
        effects,
      };

      if (groupExists(target.id)) {
        // If this is a group, return an array of fields (one element for each
        // luminaire)
        const group = getGroup(target.id);

        return group.luminaires.map(luminaireId => ({
          ...fields,
          id: luminaireId,
        }));
      } else {
        return fields;
      }
    }),
  );

  updateLuminaires(fieldsList);
};

export const cycleScenes = (scenes: string[]) => {
  let currentIndex = 0;

  if (state.activeScene && scenes.includes(state.activeScene.id)) {
    currentIndex = scenes.indexOf(state.activeScene.id);
  }

  activateScene(scenes[(currentIndex + 1) % scenes.length]);
};

export const register = async (app: Koa, options: Options) => {
  state.app = app;
  state.scenes = options;
};
