// Browser options for @remotion/renderer scripts.
// Cloud sessions: no GPU, use the preinstalled headless shell with software WebGL (ANGLE on SwiftShader).
// The Playwright build number in its folder name changes when the container image is updated.
// Elsewhere: Remotion's own Chrome with GPU WebGL through ANGLE.
import fs from 'node:fs';

const findPreinstalled = () => {
  const root = '/opt/pw-browsers';
  if (!fs.existsSync(root)) return null;
  const dirs = fs.readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse();
  for (const dir of dirs) {
    for (const sub of ['chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux/headless_shell']) {
      const p = `${root}/${dir}/${sub}`;
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
};

const preinstalled = findPreinstalled();
export const browserExecutable = preinstalled;
export const chromiumOptions = {gl: preinstalled ? 'swangle' : 'angle'};
