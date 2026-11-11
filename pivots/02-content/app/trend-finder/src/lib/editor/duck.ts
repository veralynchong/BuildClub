// Music ducking: the music goes down while someone speaks. The backend works out where the speech is (backend/finishing.py
// duck_ranges); this is the volume curve over those ranges. The player and the export both use it, so they sound alike.
import { FPS } from './timeline.ts'

export const DUCK_DB = -12 // how far the music goes down under speech
export const DUCK_GAIN = 10 ** (DUCK_DB / 20)
export const DUCK_IN_S = 0.25 // the music is already down when the speech starts
export const DUCK_OUT_S = 0.6 // and comes back slowly after it

// 1 for no speech, DUCK_GAIN under speech, a straight ramp in between.
export function duckFactor(sec: number, ranges: readonly (readonly [number, number])[]): number {
  let g = 1
  for (const [s, e] of ranges) {
    let f = 1
    if (sec >= s && sec <= e) f = DUCK_GAIN
    else if (sec < s && sec > s - DUCK_IN_S) f = 1 - (1 - DUCK_GAIN) * ((sec - (s - DUCK_IN_S)) / DUCK_IN_S)
    else if (sec > e && sec < e + DUCK_OUT_S) f = DUCK_GAIN + (1 - DUCK_GAIN) * ((sec - e) / DUCK_OUT_S)
    if (f < g) g = f
  }
  return g
}

// The music's volume at a frame: the project's level times the duck.
export function musicVolume(base: number, ranges: readonly (readonly [number, number])[] | undefined, frame: number): number {
  return ranges && ranges.length ? base * duckFactor(frame / FPS, ranges) : base
}
