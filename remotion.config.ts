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

// WebGL (three.js) in headless Chrome without a GPU: ANGLE on SwiftShader.
Config.setChromiumOpenGlRenderer('swangle');

// Cloud sessions cannot download Chrome Headless Shell; reuse the preinstalled one when present.
const preinstalled =
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
if (fs.existsSync(preinstalled)) {
  Config.setBrowserExecutable(preinstalled);
}
