import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Use the image runtime already supplied by @capacitor/assets.
const require = createRequire(import.meta.url);
const assetRequire = createRequire(require.resolve('@capacitor/assets'));
const sharp = assetRequire('sharp');
const root = fileURLToPath(new URL('../', import.meta.url));
const res = path.join(root, 'android/app/src/main/res');
const platform = process.env.CAPACITOR_PLATFORM_NAME;

if ((!platform || platform === 'android') && existsSync(res)) {
  const source = path.join(root, 'resources/android/icon.png');
  const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [density, scale] of Object.entries(densities)) {
    const dir = path.join(res, `mipmap-${density}`);
    mkdirSync(dir, { recursive: true });
    const size = Math.round(48 * scale);
    await sharp(source).resize(size, size).png().toFile(path.join(dir, 'ic_launcher.png'));
    // Android launchers mask the adaptive icon; older launchers use this round bitmap.
    const circle = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`);
    await sharp(source).resize(size, size).composite([{ input: circle, blend: 'dest-in' }]).png().toFile(path.join(dir, 'ic_launcher_round.png'));
    const canvas = Math.round(108 * scale);
    const insetSize = Math.round(64 * scale);
    const foreground = await sharp(source).resize(insetSize, insetSize).png().toBuffer();
    await sharp({ create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: foreground, gravity: 'centre' }]).png().toFile(path.join(dir, 'ic_launcher_foreground.png'));
  }
  const adaptiveDir = path.join(res, 'mipmap-anydpi-v26');
  mkdirSync(adaptiveDir, { recursive: true });
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;
  for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    writeFileSync(path.join(adaptiveDir, name), xml);
  }
  writeFileSync(path.join(res, 'values/ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources><color name="ic_launcher_background">#FFFFFF</color></resources>
`);
  console.log('Ícones do Km Rodados sincronizados para Android.');
}
