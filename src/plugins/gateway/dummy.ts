/*
 * dummy gateway
 *
 * Dummy gateway useful for development and debugging.
 * Registers dummy luminaires as supplied in config, and logs any
 * changes in these to console.
 *
 * Sample configuration:
 *
 *   './plugins/gateway/dummy': {
 *     luminaires: [
 *       {
 *         id: 'Simple light bulb #1',
 *         numLightSources: 1,
 *       },
 *       {
 *         id: 'Simple light bulb #2',
 *         numLightSources: 1,
 *       },
 *       {
 *         id: 'Luminaire with 3 light bulbs',
 *         numLightSources: 3,
 *       },
 *       {
 *         id: '1m WS2812b LED strip',
 *         numLightSources: 60,
 *       },
 *       {
 *         id: '3m WS2812b LED strip',
 *         numLightSources: 180,
 *       },
 *     ],
 *   }
 */

import * as Koa from 'koa';
import { registerLuminaire } from '../../core/luminaire';
import { Luminaire } from '../../types';

interface Options {
  luminaires: [
    {
      id: string;
      numLightSources: number;
    }
  ];
}

export const register = (app: Koa, options: Options) => {
  // Register all dummy luminaires as soon as app has finished initializing
  app.on('start', () => {
    options.luminaires.forEach(luminaire =>
      registerLuminaire(luminaire.id, 'dummy', luminaire.numLightSources),
    );
  });

  // Log changes to console
  app.on('luminairesUpdated', async (luminaires: Luminaire[]) => {
    const gwLuminaires = luminaires.filter(
      luminaire => luminaire.gateway === 'dummy',
    );

    if (gwLuminaires.length) {
      console.log('luminairesUpdated', gwLuminaires);
    }
  });
};
