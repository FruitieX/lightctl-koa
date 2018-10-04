import * as Koa from 'koa';
import {
  getLuminaireIdList,
  getLuminaire,
  Luminaire,
  SerializedLuminaire,
  getLuminaires,
} from './luminaire';
import { addGroup, createGroup } from './group';

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
  roomLuminaires?: string[];
}

export type RoomConfig = Room[];

interface State {
  rooms: Room[];
}

const state: State = {
  rooms: [],
};

/**
 * Returns current rooms state
 */
export const getRooms = () => state.rooms;

/**
 * Returns luminaires that are located in given room
 *
 * @param luminaires List of luminaires to test against
 * @param room The room to test against
 */
const getLuminairesInRoom = (
  luminaires: SerializedLuminaire[],
  room: Room,
): SerializedLuminaire[] =>
  luminaires.filter(luminaire => {
    // Luminaires without positions are never in any room
    if (!luminaire.pos) return false;

    let luminaireInZone = false;
    room.zones.forEach(zone => {
      if (luminaireInZone) return; // already found

      if (zone[0].x <= luminaire.pos!.x && zone[0].y <= luminaire.pos!.y)
        if (zone[1].x >= luminaire.pos!.x && zone[1].y >= luminaire.pos!.y) {
          luminaireInZone = true;
        }
    });

    return luminaireInZone;
  });

/**
 * Recalculates room luminaires and recreates groups based on results.
 */
const updateRooms = () => {
  const luminaires = getLuminaires();

  state.rooms.forEach(room => {
    const roomLuminaires = getLuminairesInRoom(luminaires, room);

    room.roomLuminaires = roomLuminaires.map(luminaire => luminaire.id);
    if (roomLuminaires.length) {
      addGroup(
        createGroup(room.id, roomLuminaires.map(luminaire => luminaire.id)),
      );
    }
  });
};

export const register = async (app: Koa, config: RoomConfig) => {
  state.rooms = config;
  updateRooms();
};
