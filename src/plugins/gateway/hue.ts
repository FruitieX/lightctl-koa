/*
 * hue gateway
 */

import * as Koa from 'koa';
import * as R from 'ramda';
import { registerLuminaire } from '../../core/luminaire';
import { Luminaire, Group } from '../../types';
import request = require('request-promise-native');
import { getGroups } from '../group';
import { forEachObjIndexed, intersection, reduce } from 'ramda';

interface Sensor {
  id: string;
  events: { [eventType: string]: any };
}

interface Options {
  bridgeAddr: string;
  username: string;
  sensors: Sensor[];
}

interface BridgeLightstate {
  hue: number;
  sat: number;
  bri: number;
  on: boolean;
}

interface BridgeLight {
  name: string;
  state: BridgeLightstate;
}

type BridgeLights = { [lightIndex: string]: BridgeLight };

interface BridgeScene {
  name: string;
  lights: string[];
  lightstates: { [lightIndex: string]: BridgeLightstate };
}

type BridgeScenes = { [sceneIndex: string]: BridgeScene };

interface BridgeGroup {
  name: string;
  action: BridgeLightstate;
  lights: string[];
}

type BridgeGroups = { [groupIndex: string]: BridgeGroup };

type BridgeSensors = any;
type BridgeRules = any;

interface State {
  bridgeLights: BridgeLights;
  bridgeGroups: BridgeGroups;
  bridgeSensors: BridgeSensors;
  bridgeRules: BridgeRules;
  switchSensorId: string;
  app: Koa;
  options: Options;
}
const state: State = {
  // These properties contain our view of what the bridge should be configured to at this moment
  bridgeLights: {},
  bridgeGroups: {},
  bridgeSensors: {},
  bridgeRules: {},
  switchSensorId: '',
  app: new Koa(),
  options: {
    bridgeAddr: '',
    username: '',
    sensors: [],
  },
};

const luminaireIdToLightId = (luminaireId: string): string | undefined => {
  for (const lightId in state.bridgeLights) {
    const light = state.bridgeLights[lightId];
    if (light.name === luminaireId) return lightId;
  }

  return undefined;
};

const req = async (path: string, method = 'get', body?: object) => {
  return await request({
    url: `http://${state.options.bridgeAddr}/api/${
      state.options.username
    }/${path}`,
    timeout: 1000,
    json: true,
    method,
    body: body,
  });
};

const createGroups = async (groups: Group[]) => {
  for (const group of groups) {
    const groupHueLuminaires = group.luminaires
      .map(luminaireId => {
        // Find all luminaires that have identical id with any Hue light name
        const match = Object.entries(state.bridgeLights).find(
          ([lightIndex, light]) => light.name === luminaireId,
        );

        // Return null on no match
        if (!match) return null;

        // Otherwise return lightIndex
        const [lightIndex] = match;
        return lightIndex;
      })
      // Filter out null values
      .filter(lightIndex => lightIndex !== null);

    if (groupHueLuminaires.length) {
      console.log(`hue: creating group "${group.id}"`);
      await req(`groups`, 'post', {
        name: group.id,
        lights: groupHueLuminaires,
      });
    }
  }
};

const luminairesUpdated = async (luminaires: Luminaire[]) => {
  // Requests array contains Hue API requests to be made, one for each luminaire
  const luminaireRequests = luminaires.map(luminaire => {
    const state = luminaire.lightSources[0].newState;

    return {
      id: luminaire.id,

      body: {
        on: state.v !== 0,
        // Our h value is in [0, 360[, Hue uses [0, 65536[
        hue: Math.round(state.h / 360 * 65536),
        // Our s value is in [0, 100], Hue uses [0, 254]
        sat: Math.round(state.s / 100 * 254),
        // Our v value is in [0, 100], Hue uses [1, 254]
        // (but seems to accept 0 just fine)
        bri: Math.round(state.v / 100 * 254),
      },
    };
  });

  // Try optimizing away requests by grouping together as much as possible

  // Group luminaires together by identical newStates
  const groupedLuminaires = R.groupWith(
    (a, b) => R.equals(a.lightSources[0].newState, b.lightSources[0].newState),
    luminaires,
  );

  // See if we have any existing groups that contain all of these luminaires
  const groups = getGroups();

  /*
  const groupMatches = groupedLuminaires.map(luminaires => {
    const group = groups.find(group => group.luminaires
  });

  const luminaireIds = luminaires.map(luminaire => luminaire.id);
  const groupMatches = groups.filter(group => {
    const luminairesInBoth = intersection(luminaireIds, group.luminaires);
    if (luminairesInBoth.length === group.luminaires.length) {
      return reduce((a, b) => a, true, luminairesInBoth);
    }

    return false;
  });
  */

  for (let luminaireRequest of luminaireRequests) {
    const lightId = luminaireIdToLightId(luminaireRequest.id);
    if (lightId) {
      console.log(
        'put:',
        `lights/${lightId}/state`,

        luminaireRequest.body,
      );
      await req(`lights/${lightId}/state`, 'put', luminaireRequest.body);
    }
  }
};

const delay = (ms: number) =>
  new Promise((resolve, reject) => setTimeout(resolve, ms));

const pollLights = async () => {
  while (true) {
    const newBridgeLights = <BridgeLights>await req('lights');

    // Diff them to state.bridgeLights

    await delay(1000);
  }
};

const pollSensors = async () => {
  while (true) {
    try {
      const buttonSensor = await req(`sensors/${state.switchSensorId}`);

      const [sensorId, _state] = buttonSensor.name.split(',');

      // Button sensor has unhandled event
      if (_state) {
        const bridgeSensor = state.bridgeSensors[sensorId];

        if (bridgeSensor) {
          const switchName = bridgeSensor.name;
          const sensor = state.options.sensors.find(
            sensor => sensor.id === switchName,
          );
          if (!sensor) {
            throw new Error('Sensor not found');
          }

          const sensorEvents = sensor.events;

          console.log(
            `hue/switches: Got button ${_state} press on switch: ${switchName}`,
          );

          const events = sensorEvents[_state];

          if (events) {
            forEachObjIndexed((payload: any, event: any) => {
              console.log(
                `hue/switches: Invoking event ${event} with payload ${JSON.stringify(
                  payload,
                )}`,
              );
              state.app.emit(event, payload);
            }, events);
          }
        }

        // Mark event as handled
        await req(`sensors/${state.switchSensorId}`, 'put', { name: 'null' });
      }
    } catch (e) {
      console.log('Error while polling for button events:', e);
    }

    await delay(100);
  }
};

const createButtonEventAction = (
  switchSensorId: string,
  sensorId: string,
  state: string,
) => ({
  address: `/sensors/${switchSensorId}`,
  body: {
    name: `${sensorId},${state}`,
  },
  method: 'PUT',
});

const buttonEventAddress = /\/sensors\/(\d+)\/state\/buttonevent/;

// We only care about HOLD and SHORT_RELEASED states on on/off buttons
// TODO: autodetect based on config?
const BUTTON_STATES: { [key: string]: number } = {
  // ON_PRESSED: 1000,
  ON_HOLD: 1001,
  ON_SHORT_RELEASED: 1002,
  // ON_LONG_RELEASED: 1003,

  UP_PRESSED: 2000,
  //UP_HOLD: 2001,
  UP_SHORT_RELEASED: 2002,
  UP_LONG_RELEASED: 2003,

  DOWN_PRESSED: 3000,
  //DOWN_HOLD: 3001,
  DOWN_SHORT_RELEASED: 3002,
  DOWN_LONG_RELEASED: 3003,

  //OFF_PRESSED: 4000,
  OFF_HOLD: 4001,
  OFF_SHORT_RELEASED: 4002,
  // OFF_LONG_RELEASED: 4003,
};

const initSensors = async () => {
  let switchSensorId = Object.keys(state.bridgeSensors).find(
    sensorIndex => state.bridgeSensors[sensorIndex].modelid === 'Switch Sensor',
  );

  if (!switchSensorId) {
    // Create switch sensor
    const [result] = await req(`sensors`, 'post', {
      name: 'null',
      modelid: 'Switch Sensor',
      swversion: '1',
      type: 'CLIPGenericStatus',
      uniqueid: 'switchsensor',
      manufacturername: 'smart-switches',
    });

    switchSensorId = result.success.id;
    console.log(
      `hue/switches: Created switch sensor with ID ${switchSensorId}`,
    );
  } else {
    console.log(`hue/switches: Using switch sensor with ID ${switchSensorId}`);
  }

  state.switchSensorId = <string>switchSensorId;

  // Reprogram dimmer switch rules to work as special "switch sensors"
  for (const sensorId in state.bridgeSensors) {
    const sensor = state.bridgeSensors[sensorId];

    // Skip non ZLLSwitch type switches
    if (sensor.type !== 'ZLLSwitch') continue;

    for (const stateId in BUTTON_STATES) {
      const buttonEventAction = createButtonEventAction(
        state.switchSensorId,
        sensorId,
        stateId,
      );

      console.log(
        `hue/switches: creating rule for switch: ${sensor.name} (${stateId})`,
      );

      const [result] = await req('rules', 'post', {
        name: `Switch ${sensorId} ${stateId}`,
        conditions: [
          {
            address: `/sensors/${sensorId}/state/buttonevent`,
            operator: 'eq',
            value: String(BUTTON_STATES[stateId]), // API expects this to be a string for whatever reason
          },
        ],
        actions: [buttonEventAction],
      });
    }
  }
};

export const register = async (app: Koa, options: Options) => {
  state.options = options;
  state.app = app;

  app.on('start', async () => {
    const groups = getGroups();

    state.bridgeLights = <BridgeLights>await req('lights');
    state.bridgeGroups = <BridgeGroups>await req('groups');
    state.bridgeSensors = <BridgeSensors>await req('sensors');
    state.bridgeRules = <BridgeRules>await req('rules');
    //const bridgeScenes = <BridgeScenes>await req('scenes', options);

    // Register hue lights as luminaires
    forEachObjIndexed(light => {
      registerLuminaire(light.name, 'hue', 1);
    }, state.bridgeLights);

    // Delete all existing groups
    console.log(`hue: deleting all existing hue groups`);
    for (const groupIndex in state.bridgeGroups)
      await req(`groups/${groupIndex}`, 'delete');

    // Delete all existing sensors
    /*
    for (const sensorIndex in state.bridgeSensors)
      await req(`sensors/${sensorIndex}`, 'delete');
    */

    // Delete all existing rules
    console.log(`hue: deleting all existing hue rules`);
    for (const ruleIndex in state.bridgeRules)
      await req(`rules/${ruleIndex}`, 'delete');

    // Create groups as configured
    await createGroups(groups);

    // Fetch newly created groups
    state.bridgeGroups = <BridgeGroups>await req('groups');

    // TODO: scenes? maybe pointless as our scenes aren't exactly static
    /*
    // Delete all existing scenes
    for (const sceneIndex in bridgeScenes)
      await req(`scenes/${sceneIndex}`, options, 'delete');
    */

    await initSensors();

    pollLights();
    pollSensors();
  });

  app.on('luminairesUpdated', async (luminaires: Luminaire[]) => {
    const gwLuminaires = luminaires.filter(
      luminaire => luminaire.gateway === 'hue',
    );

    if (gwLuminaires.length) {
      luminairesUpdated(gwLuminaires);
    }
  });
};
