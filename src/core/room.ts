import * as Koa from 'koa';
import {
  adjustBrightnessOffset,
  setBrightnessOffset,
} from '../plugins/effects/brightness';

export interface Coordinate {
  x: number;
  y: number;
  z?: number;
}

type Zone = [Coordinate, Coordinate];

export interface Room {
  id: string;
  zones: Zone[];
  icon?: string;
}

export type RoomConfig = Room[];

interface State {
  rooms: Room[];
}

const state: State = {
  rooms: [],
};

export const register = async (app: Koa, config: RoomConfig) => {};
