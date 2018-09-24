/*
 * hue gateway
 */

import * as Koa from 'koa';
import * as R from 'ramda';
import {
  registerLuminaire,
  getLuminaire,
  Luminaire,
} from '../../core/luminaire';
import request = require('request-promise-native');
import { getGroups, Group } from '../../core/group';
import { forEachObjIndexed, intersection, reduce } from 'ramda';
import { convert } from 'chromatism2';

interface Event {
  action: string;
  payload: { [payloadProp: string]: any };
}

interface Sensor {
  id: string;
  events: { [eventType: string]: Event[] };
}

interface Options {
  bridgeAddr: string;
  username: string;
  sensors: Sensor[];
  customPollLogic?: {
    [luminaireId: string]: (bridgeLight: BridgeLight, old: BridgeLight) => void;
  };
}

interface BridgeLightstate {
  hue: number;
  sat: number;
  bri: number;
  on: boolean;
}

export interface BridgeLight {
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

interface HueLuminaire {
  luminaire: Luminaire;
  light: BridgeLight;
  lightId: string;
}

interface State {
  bridgeLights: BridgeLights;
  bridgeGroups: BridgeGroups;
  bridgeSensors: BridgeSensors;
  bridgeRules: BridgeRules;
  hueLuminaires: HueLuminaire[];
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
  hueLuminaires: [],
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

const lightByLuminaireId = (luminaireId: string): BridgeLight | undefined => {
  for (const lightId in state.bridgeLights) {
    const light = state.bridgeLights[lightId];
    if (light.name === luminaireId) return light;
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

interface Request {
  id: string;
  body: {
    on: boolean;
    hue: number;
    sat: number;
    bri: number;
    transitiontime: number;
  };
}

interface OptimizedRequest {
  id: string;
  body: {
    on?: boolean;
    hue?: number;
    sat?: number;
    bri?: number;
    transitiontime?: number;
  };
}

const absDiff = (a: number, b: number) => Math.abs(a - b);

const optimizeRequest = (request: Request): OptimizedRequest | null => {
  // Current light state as per the Hue bridge
  const hueLight = lightByLuminaireId(request.id);

  const optimized: OptimizedRequest = {
    id: request.id,
    body: {},
  };

  if (!hueLight)
    throw new Error(`Hue light not found for luminaire ${request.id}`);

  if (hueLight.state.on !== request.body.on)
    optimized.body.on = request.body.on;

  // Transitiontime only matters if:
  // 1. light is currently on
  // 2. we are toggling on state
  if (hueLight.state.on || optimized.body.on !== undefined) {
    // 400 ms (or 4 hundredths of a second) is the default transition time in Hue,
    // and 500 ms is the default in lightctl (which is close enough for an
    // optimization). Don't bother sending either.
    if (request.body.transitiontime !== 4 && request.body.transitiontime !== 5)
      optimized.body.transitiontime = request.body.transitiontime;
  }

  // These only matter if the bulb is going to be on after this command
  if ((hueLight.state.on || optimized.body.on) && optimized.body.on !== false) {
    if (absDiff(hueLight.state.hue, request.body.hue) >= 400)
      optimized.body.hue = request.body.hue;

    if (absDiff(hueLight.state.sat, request.body.sat) >= 4)
      optimized.body.sat = request.body.sat;

    if (absDiff(hueLight.state.bri, request.body.bri) >= 4)
      optimized.body.bri = request.body.bri;
  }

  // Request is a no-op
  if (
    optimized.body.on === undefined &&
    optimized.body.hue === undefined &&
    optimized.body.sat === undefined &&
    optimized.body.bri === undefined
  )
    return null;

  return optimized;
};

const luminairesUpdated = async (
  luminaires: Luminaire[],
  transitionTime?: number,
) => {
  // Requests array contains Hue API requests to be made, one for each luminaire
  const luminaireRequests: Request[] = luminaires.map(luminaire => {
    const state = convert(luminaire.lightSources[0].newState).hsv;

    return {
      id: luminaire.id,

      body: {
        on: state.v !== 0,
        // Our h value is in [0, 360[, Hue uses [0, 65536[
        hue: Math.round((state.h / 360) * 65536),
        // Our s value is in [0, 100], Hue uses [0, 254]
        sat: Math.round((state.s / 100) * 254),
        // Our v value is in [0, 100], Hue uses [1, 254]
        // (but seems to accept 0 just fine)
        bri: Math.round((state.v / 100) * 254),

        // Hue uses hundredths of a second as transitiontime unit
        transitiontime: Math.round(
          (transitionTime !== undefined
            ? transitionTime
            : luminaire.transitionTime) / 100,
        ),
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

  const optimizedRequests = luminaireRequests.map(optimizeRequest);

  for (let luminaireRequest of optimizedRequests) {
    if (!luminaireRequest) continue;

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

let pollLightsTimeout: NodeJS.Timer | undefined;
const pollLights = async () => {
  try {
    const oldBridgeLights = state.bridgeLights;
    const curBridgeLights = <BridgeLights>await req('lights');
    state.bridgeLights = curBridgeLights;

    // Get most recent luminaire state for each bridge light
    const luminaires: Luminaire[] = [];
    for (const lightId in curBridgeLights) {
      const hueLuminaire = state.hueLuminaires.find(
        hueLuminaire => hueLuminaire.lightId === lightId,
      );

      if (!hueLuminaire) continue;

      if (
        state.options.customPollLogic &&
        state.options.customPollLogic[hueLuminaire.luminaire.id]
      ) {
        const pollFun =
          state.options.customPollLogic[hueLuminaire.luminaire.id];

        pollFun(curBridgeLights[lightId], oldBridgeLights[lightId]);
      } else {
        const luminaire = getLuminaire(hueLuminaire.luminaire.id);
        luminaires.push(luminaire);
      }
    }

    await luminairesUpdated(luminaires, 1000);
  } catch (e) {
    console.error(e);
  }

  pollLightsTimeout = setTimeout(pollLights, 1000);
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
            events.forEach(event => {
              console.log(
                `hue/switches: Invoking action ${
                  event.action
                } with payload ${JSON.stringify(event.payload)}`,
              );
              state.app.emit(event.action, event.payload);
            });
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

const filterHueLuminaires = (luminaires: Luminaire[]): Luminaire[] => {
  return luminaires.filter(luminaire => luminaire.gateway === 'hue');
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
    forEachObjIndexed((light, lightId) => {
      const luminaire = registerLuminaire(light.name, 'hue', 1);
      state.hueLuminaires.push({ luminaire, light, lightId: <string>lightId });
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

  app.on('luminairesUpdated', (luminaires: Luminaire[]) => {
    const gwLuminaires = filterHueLuminaires(luminaires);
    if (gwLuminaires.length) {
      luminairesUpdated(gwLuminaires);
      pollLightsTimeout && clearTimeout(pollLightsTimeout);
      pollLightsTimeout = setTimeout(pollLights, 1000);
    }
  });
};
