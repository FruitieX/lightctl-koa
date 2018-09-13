import * as Koa from 'koa';
import { ColourModes, convert } from 'chromatism2';
import { updateLuminaires, LuminaireUpdateFields } from './luminaire';
import { groupExists, getGroup } from './group';
import { flatten } from 'ramda';
import { Effect } from './effect';

export interface SceneTarget {
  id: string;
  brightness?: number;

  // optional overrides
  effects?: Effect[];
  colors?: ColourModes.Any[];
}

export interface Scene {
  id: string;
  effects: Effect[];
  colors: ColourModes.Any[];
  targets: SceneTarget[];
}

export type SceneConfig = Scene[];

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
export const activateScene = (id: string) => {
  const scene = state.scenes.find(scene => scene.id === id);

  if (!scene) throw new Error(`Scene with id '${id}' not found`);

  state.activeScene = scene;

  // TODO: get rid of janky type assertions
  const fieldsList = <LuminaireUpdateFields[]>flatten(
    scene.targets.map(target => {
      const brightness =
        target.brightness === undefined ? 1 : target.brightness;

      const colors = (target.colors || scene.colors)
        .map(color => convert(color).hsv)
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

export const resetActiveScene = () => {
  delete state.activeScene;
};

export const getScenes = (): Scene[] => {
  return Object.values(state.scenes);
};

export const cycleScenes = (scenes: string[]) => {
  let currentIndex = -1;

  if (state.activeScene && scenes.includes(state.activeScene.id)) {
    currentIndex = scenes.indexOf(state.activeScene.id);
  }

  activateScene(scenes[(currentIndex + 1) % scenes.length]);
};

export const register = async (app: Koa, options: Options) => {
  state.app = app;
  state.scenes = options;

  console.log('Registered scenes:', state.scenes.map(scene => scene.id));

  app.on('cycleScenes', ({ scenes }: { scenes: string[] }) =>
    cycleScenes(scenes),
  );
  app.on('activateScene', ({ id }: { id: string }) => activateScene(id));

  // Activate first scene
  if (state.scenes[0]) activateScene(state.scenes[0].id);
};
