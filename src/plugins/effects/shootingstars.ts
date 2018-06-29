import { ColourModes } from 'chromatism2';
import { EffectOptions } from '../../types';
import { getColorTransition } from '../../utils';
import { convert } from 'chromatism2';
import { clone } from 'ramda';

interface Star {
  pos: number;
  velocity: number; // Pixels / second
  trailLength: number;
  colorIndex: number;
}

interface LuminaireState {
  stars: Star[];
  lastUpdate: number;
}

interface State {
  luminaires: {
    [luminaireId: string]: LuminaireState;
  };
}

const state: State = {
  luminaires: {},
};

const defaultLuminaireState: LuminaireState = {
  stars: [],
  lastUpdate: new Date().getTime(),
};

export default (
  colors: ColourModes.Any[],
  options: EffectOptions,
  luminaireIndex: number,
  luminaireId: string,
  numLightSources: number,
  effectIndex: number,
  numEffects: number,
): ColourModes.Any[] => {
  let output = [...Array(numLightSources)].map(() => ({
    L: 0,
    a: 0,
    b: 0,
  }));

  const luminaireState: LuminaireState = clone(
    state.luminaires[luminaireId] || defaultLuminaireState,
  );

  const t = new Date().getTime();
  const dt = t - luminaireState.lastUpdate;

  // Spawn new star
  if (luminaireState.stars.length === 0 || (Math.random() < (options.spawnProbability || 0.005))) {
    // if (luminaireState.stars.length === 0) {
    const leftSpawn = Math.random() < 0.5;
    // const leftSpawn = false;

    const pos = leftSpawn ? -1 : numLightSources;
    const minSpeed = options.minSpeed || 3;
    const maxSpeed = options.maxSpeed || 12;
    const velocity =
      // Direction
      (leftSpawn ? 1 : -1) *
      // Speed
      (Math.random() * (maxSpeed - minSpeed) + minSpeed);
    luminaireState.stars.push({
      pos,
      velocity,
      colorIndex: Math.floor(Math.random() * colors.length),
      trailLength: Math.floor(10 + Math.abs(velocity) / 2),
      //trailLength: 8,
    });
    // }
  }

  luminaireState.stars = luminaireState.stars
    // Move stars according to velocity
    .map(star => ({
      ...star,
      pos: star.pos + (star.velocity * dt) / 1000,
    }))
    // Filter out stars that are no longer visible
    .filter(star => {
      if (star.velocity > 0) {
        return star.pos - star.trailLength <= numLightSources;
      } else {
        return star.pos + star.trailLength >= 0;
      }
    });

  const starValues = luminaireState.stars.map(star => {
    const dir = star.velocity > 0 ? 1 : -1;

    const floorPos = dir > 0 ? Math.floor(star.pos) : Math.ceil(star.pos);
    let subPos = star.pos - floorPos;

    // Subpixel pos reversed if star travels left
    subPos *= dir;

    let values: number[] = [];
    [...Array(star.trailLength)].forEach((_, i) => {
      let trailPos = floorPos + i * dir * -1;
      //trailPos = star.velocity > 0 ? Math.floor(trailPos) : Math.ceil(trailPos);

      if (output[trailPos]) {
        let value = 0;

        if (i === 0) {
          // Fade in first LED
          value = subPos;
        } else if (i < 2) {
          value = 1;
        } else {
          // Fade out rest of trail
          value = 1 - (i - 2 + subPos) / star.trailLength;
        }

        values[trailPos] = value;
      }
    });

    return values;
  });

  const maxLightness = 100;

  const totalValForPixel: number[]  = [];
  starValues.forEach((values, starIndex) => {
    const star = luminaireState.stars[starIndex];
    const color = convert(colors[star.colorIndex] || colors[0]).cielab;

    values.forEach((value, index) => {
      output[index].L = Math.min(maxLightness, output[index].L + value * color.L);
      output[index].a += value * color.a;
      output[index].b += value * color.b;
      //totalValForPixel[index] = totalValForPixel[index] ? totalValForPixel[index] + value : 0;
    });
  });

  luminaireState.lastUpdate = t;
  state.luminaires[luminaireId] = luminaireState;

  // console.log(output);
  return output;
};
