import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Also runs when Ionic invokes cap sync directly, without npm run sync:ios.
if (!process.env.CAPACITOR_PLATFORM_NAME || process.env.CAPACITOR_PLATFORM_NAME === 'ios') {
  const root = new URL('../', import.meta.url);
  const catalog = new URL('ios/App/App/Assets.xcassets/AppIcon.appiconset/', root);
  if (existsSync(catalog)) {
    const images = [
      { source: 'AppIcon.png', filename: 'AppIcon-512@2x.png' },
      { source: 'AppIcon-dark.png', filename: 'Icon-KmRodados-Dark-1024x1024@1x.png', appearances: [{ appearance: 'luminosity', value: 'dark' }] }
    ];
    for (const image of images) {
      copyFileSync(new URL(`resources/ios/${image.source}`, root), new URL(image.filename, catalog));
    }
    writeFileSync(new URL('Contents.json', catalog), JSON.stringify({
      images: images.map(({ source, ...image }) => ({ ...image, idiom: 'universal', platform: 'ios', size: '1024x1024' })),
      info: { author: 'xcode', version: 1 }
    }, null, 2) + '\n');
    console.log(`Ícones do Km Rodados sincronizados: ${fileURLToPath(catalog)}`);
  }
}
