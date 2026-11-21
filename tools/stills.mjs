// Render several frames of a composition in one go (bundles once).
// Usage: node tools/stills.mjs <CompositionId> <outDir> <seconds,...> [--guides]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {browserExecutable, chromiumOptions} from './browser.mjs';

const [id, outDir, list, flag] = process.argv.slice(2);
const props = {guides: flag === '--guides'};
const opts = {browserExecutable, chromiumOptions};
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id, inputProps: props, ...opts});
for (const sec of list.split(',').map(Number)) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(sec * composition.fps));
  const t0 = Date.now();
  await renderStill({composition, serveUrl, frame, inputProps: props, output: path.join(outDir, `t${sec.toFixed(1).padStart(6, '0')}.png`), ...opts});
  console.log(`t=${sec}s frame ${frame}  ${Date.now() - t0} ms`);
}
