import * as Koa from 'koa';
import { Scene } from '../types';

interface Options {}

interface State {
  app?: Koa;
  scenes: {
    [id: string]: Scene;
  };
}

const state: State = {
  scenes: {},
};

export const register = async (app: Koa, options: Options) => {
  state.app = app;
};
