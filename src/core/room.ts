import * as Koa from 'koa';
import { getLuminaireIdList, getLuminaire, Luminaire } from './luminaire';
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
}

export type RoomConfig = Room[];

interface State {
  rooms: Room[];
}

const state: State = {
  rooms: [],
};

const getLuminairesInRoom = (
  luminaires: Luminaire[],
  room: Room,
): Luminaire[] =>
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

const updateRooms = () => {
  const luminaires = getLuminaireIdList().map(getLuminaire);

  state.rooms.forEach(room => {
    const roomLuminaires = getLuminairesInRoom(luminaires, room);

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
