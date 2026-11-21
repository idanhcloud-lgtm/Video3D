import {Config} from '@remotion/cli/config';
import fs from 'node:fs';

// Quality first: lossless frames, low CRF, slow x264 preset, BT.709 colour.
Config.setVideoImageFormat('png');
Config.setCodec('h264');
Config.setCrf(16);
Config.setX264Preset('slow');
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');
Config.setAudioBitrate('320k');
Config.setOverwriteOutput(true);

// Cloud sessions: no GPU and no Chrome download. Reuse the preinstalled headless shell and run WebGL
// (three.js) in software (ANGLE on SwiftShader). On a normal machine Remotion downloads its own Chrome
// and uses the GPU through ANGLE, which renders the 3D scenes many times faster.
// The Playwright build number in the folder name changes when the container image is updated.
const findPreinstalled = (): string | undefined => {
  const root = '/opt/pw-browsers';
  if (!fs.existsSync(root)) return undefined;
  for (const dir of fs.readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse()) {
    for (const sub of ['chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux/headless_shell']) {
      const p = `${root}/${dir}/${sub}`;
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
};
const preinstalled = findPreinstalled();
if (preinstalled) {
  Config.setBrowserExecutable(preinstalled);
  Config.setChromiumOpenGlRenderer('swangle');
} else {
  Config.setChromiumOpenGlRenderer('angle');
}
