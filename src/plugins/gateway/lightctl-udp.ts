/*
 * lightctl-udp
 *
 * Lightweight protocol for controlling luminaires over UDP/IPv4.
 * Uses UDP to avoid retransmission delays and other crap we don't want.
 *
 * # Protocol details:
 *
 * Luminaires can register by transmitting their ID and number of light sources
 * as a JSON message. This same message should be repeated every few seconds
 * as a keepalive message.
 *
 * Each frame, an array of HSV values (one set for each light source) gets
 * transmitted to each registered luminaire. The HSV values are scaled to the
 * range of Uint8:s, or 0 - 255. This array is followed by the following
 * configuration parameters (also Uint8):
 *
 * - Number of dithering steps to use (0 = disable dithering)
 * - Gamma value, red component      (actual value is /= 100)
 * - Gamma value, green component    (actual value is /= 100)
 * - Gamma value, blue component     (actual value is /= 100)
 * - Contrast value, red component   (actual value is /= 255)
 * - Contrast value, green component (actual value is /= 255)
 * - Contrast value, blue component  (actual value is /= 255)
 *
 * # Sample configuration:
 *
 * plugins:
 *   ./plugins/gateway/lightctl-udp:
 *     port: 1234
 *     gammaCorrection:
 *       Light 1: [240, 235, 210]
 *       Light 2: [245, 235, 230]
 *       Light 3: [245, 235, 230]
 *     contrast:
 *       Light 1: [255, 220, 220]
 *       Light 2: [255, 240, 230]
 *       Light 3: [255, 240, 230]
 */

import * as Koa from 'koa';
import { createSocket, AddressInfo } from 'dgram';
import { Luminaire, HSVState } from '../../types';
import { registerLuminaire, getLuminaire } from '../../core/luminaire';

const udpServer = createSocket('udp4');

interface Client {
  addr: AddressInfo;
  id: string;
  gammaCorrection: number[];
  contrast: number[];
  luminaireId: string;
  sendInterval?: NodeJS.Timer;
  timeout?: NodeJS.Timer;
}

interface Options {
  port: number;
  gammaCorrection: {
    [propName: string]: number[];
  };
  contrast: {
    [propName: string]: number[];
  };
}

const clients: Client[] = [];

const send = (client: Client) => () => {
  const luminaire = getLuminaire(client.luminaireId);
  const array = new Uint8Array(luminaire.lightSources.length * 3 + 7); // + 1 is dither flag, + 3 are rgb gamma correction values, + 3 is for contrast

  luminaire.lightSources.forEach((source, index) => {
    const currentState = source.state;

    array[index * 3 + 0] = Math.floor(currentState.h / 360 * 255); // hue
    array[index * 3 + 1] = Math.floor(currentState.s / 100 * 255); // saturation
    array[index * 3 + 2] = Math.floor(currentState.v / 100 * 255); // value

    // const rgb = convert.hsv.rgb.raw(currentState);
    //
    // const val = (Math.sin(new Date().getTime() / 1000 + index) + 1) / 2;
    // //const val = 1;
    //
    // const r = rgb[0] * val;
    // const g = rgb[1] * val;
    // const b = rgb[2] * val;
    //
    // let r_ = Math.floor(r);
    // let g_ = Math.floor(g);
    // let b_ = Math.floor(b);

    /*
    if (r_) {
      if (g > 0.5 && !g_) g_ = 1;
      if (b > 0.5 && !b_) b_ = 1;
    }
    if (g_) {
      if (r > 0.5 && !r_) r_ = 1;
      if (b > 0.5 && !b_) b_ = 1;
    }
    if (b_) {
      if (r > 0.5 && !r_) r_ = 1;
      if (g > 0.5 && !g_) g_ = 1;
    }
    */

    //array[index * 3 + 0] = r_; //r_;
    //array[index * 3 + 1] = g_; //g_;
    //array[index * 3 + 2] = b_; //b_;
  });

  array[luminaire.lightSources.length * 3] = 4; // enable dithering with 4 steps

  array[luminaire.lightSources.length * 3 + 1] = client.gammaCorrection[0]; // red gamma correction
  array[luminaire.lightSources.length * 3 + 2] = client.gammaCorrection[1]; // green gamma correction
  array[luminaire.lightSources.length * 3 + 3] = client.gammaCorrection[2]; // blue gamma correction
  array[luminaire.lightSources.length * 3 + 4] = client.contrast[0]; // red contrast
  array[luminaire.lightSources.length * 3 + 5] = client.contrast[1]; // green contrast
  array[luminaire.lightSources.length * 3 + 6] = client.contrast[2]; // blue contrast

  udpServer.send(
    <Buffer>array,
    0,
    array.length,
    client.addr.port,
    client.addr.address,
  );
};

const removeClient = (client: Client) => {
  client.sendInterval && clearInterval(client.sendInterval);
  const index = clients.findIndex(
    existingClient =>
      existingClient.addr.address === client.addr.address &&
      existingClient.addr.port === client.addr.port,
  );

  console.log('removing idle client', client.id);

  if (index !== -1) {
    clients.splice(index, 1);
  }
};

const setClientTimeout = (client: Client) => {
  client.timeout && clearTimeout(client.timeout);
  client.timeout = setTimeout(() => {
    removeClient(client);
  }, 30000);
};

export const register = async (app: Koa, options: Options) => {
  const gammaCorrection = options.gammaCorrection || {};
  const contrast = options.contrast || {};

  udpServer.on('message', (msg, addr) => {
    const existingClient = clients.find(
      client =>
        client.addr.address === addr.address && client.addr.port === addr.port,
    );

    if (existingClient) {
      //console.log('got keepalive from', existingClient.id);
      setClientTimeout(existingClient);
      // TODO: re-register luminaire?
    } else {
      const json = JSON.parse(msg.toString());
      const { id, numLights } = json;

      if (!id) {
        return console.log('id field must be provided.');
      }
      if (!numLights) {
        return console.log('numLights field must be provided.');
      }

      //console.log('lightctl-udp', json, 'registered.');

      const luminaire = registerLuminaire(id, 'lightctl-udp', numLights);

      let client: Client = {
        addr,
        id,
        gammaCorrection: gammaCorrection[id] || [220, 250, 180],
        contrast: contrast[id] || [255, 255, 255],
        luminaireId: luminaire.id,
      };

      setClientTimeout(client);
      client.sendInterval = setInterval(send(client), 10);

      clients.push(client);
    }
  });

  udpServer.bind(options.port);
  console.log('lightctl-udp bound to port', options.port);
};
