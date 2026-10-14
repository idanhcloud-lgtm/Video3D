import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// Fonts are bundled in public/fonts so renders work offline and look identical everywhere.
export const fontFamily = 'Lexend';

const subsets = {
  latin:
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  vietnamese:
    'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB',
};

export const fontsLoaded = Promise.all(
  Object.entries(subsets).flatMap(([subset, unicodeRange]) =>
    ['400', '500', '600', '700', '800'].map((weight) =>
      loadFont({
        family: fontFamily,
        url: staticFile(`fonts/lexend-${subset}-${weight}-normal.woff2`),
        weight,
        unicodeRange,
      }),
    ),
  ),
);

export const colors = {
  bg: '#060a16',
  panel: '#0b1222',
  panelHeader: '#0e1628',
  line: '#1b2540',
  text: '#ffffff',
  muted: '#8f9bb5',
  green: '#34e39e',
  red: '#f25f5c',
  yellow: '#f5c542',
  amber: '#d9a93f',
};

export const VIDEO = {width: 1920, height: 1080, fps: 60};

// Scene timelines are written in 30-per-second units so they stay valid at any output fps.
export const TIMELINE_FPS = 30;
export const toFrames = (timelineUnits: number) => Math.round((timelineUnits * VIDEO.fps) / TIMELINE_FPS);
