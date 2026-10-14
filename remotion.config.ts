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
const preinstalled =
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
if (fs.existsSync(preinstalled)) {
  Config.setBrowserExecutable(preinstalled);
  Config.setChromiumOpenGlRenderer('swangle');
} else {
  Config.setChromiumOpenGlRenderer('angle');
}
