import { mkdir } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const clientRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(clientRoot, 'src', 'assets', 'images');
const outputRoot = resolve(sourceRoot, 'optimized');

const imageWidths = {
  'atmcard.jpg': [480, 800],
  'buddha.jpg': [640, 1280],
  'candle.jpg': [320, 640, 1280],
  'candle2.png': [256, 512],
  'candle3.jpg': [64, 320, 640],
  'candle4.jpg': [320, 640],
  'candle5.jpg': [320, 640, 1280],
  'crystals.jpg': [320, 640],
  'difuser.jpg': [320, 640],
  'hand.jpg': [320, 640],
  'homeDecor.jpg': [320, 640],
  'homeDecor1.jpg': [320, 640],
  'incense.jpg': [480, 800],
  'lavender.jpg': [320, 640],
  'lavenderbg.png': [256, 500],
  'lavenderOil.jpg': [320, 640, 1280],
  'light1.jpg': [640, 1280],
  'man.jpg': [480, 800],
  'mat.jpg': [320, 640],
  'oil.jpg': [320, 640],
  'oil1.jpg': [320, 640],
  'oil2.jpg': [320, 640],
  'oregano.jpg': [320, 640],
  'roller.jpg': [320, 640],
  'rosemary.jpg': [320, 640],
  'rosemarybg.png': [256, 500],
  'roseOil.jpg': [320, 640],
  'sage1.jpg': [320, 640, 1280],
  'sage2.jpg': [480, 800],
  'sage3.jpg': [320, 640],
  'sage4.jpg': [320, 640],
  'scentedCandles.jpg': [640, 1280],
  'shopingCart.jpg': [480, 800],
  'soy.jpg': [320, 640],
  'stick.jpg': [320, 640],
  'vase.png': [256, 500],
  'vase2.jpg': [320, 640],
  'vase3.jpg': [320, 640],
  'vase4.jpg': [320, 640],
  'wellness.jpg': [640, 1280],
  'womanSage.jpg': [480, 800],
};

await mkdir(outputRoot, { recursive: true });

let sourceBytes = 0;
let generatedBytes = 0;
let generatedCount = 0;

for (const [filename, requestedWidths] of Object.entries(imageWidths)) {
  const sourcePath = resolve(sourceRoot, filename);
  if (!sourcePath.startsWith(`${sourceRoot}\\`) && !sourcePath.startsWith(`${sourceRoot}/`)) {
    throw new Error(`Refusing to read outside the image source directory: ${filename}`);
  }

  const source = sharp(sourcePath, { failOn: 'warning' });
  const metadata = await source.metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Missing dimensions for ${filename}`);

  const sourceStats = await import('node:fs/promises').then(({ stat }) => stat(sourcePath));
  sourceBytes += sourceStats.size;
  const fallbackFormat = extname(filename).toLowerCase() === '.png' ? 'png' : 'jpg';
  const stem = basename(filename, extname(filename));

  for (const width of requestedWidths) {
    if (width > metadata.width) throw new Error(`Refusing to upscale ${filename} to ${width}px`);

    const fallbackPath = resolve(outputRoot, `${stem}-${width}.${fallbackFormat}`);
    const webpPath = resolve(outputRoot, `${stem}-${width}.webp`);
    if (fallbackFormat === 'png') {
      await sharp(sourcePath)
        .resize({ width, withoutEnlargement: true })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toFile(fallbackPath);
    } else {
      await sharp(sourcePath)
        .resize({ width, withoutEnlargement: true })
        .jpeg({ quality: 78, progressive: true, mozjpeg: true })
        .toFile(fallbackPath);
    }
    const webpOptions = fallbackFormat === 'png'
      ? { lossless: true, effort: 6 }
      : { quality: 75, effort: 6 };
    await sharp(sourcePath)
      .resize({ width, withoutEnlargement: true })
      .webp(webpOptions)
      .toFile(webpPath);

    const { stat } = await import('node:fs/promises');
    generatedBytes += (await stat(fallbackPath)).size + (await stat(webpPath)).size;
    generatedCount += 2;
  }
}

const percent = ((1 - generatedBytes / sourceBytes) * 100).toFixed(1);
console.log(`Generated ${generatedCount} responsive assets from ${Object.keys(imageWidths).length} originals.`);
console.log(`Selected originals: ${(sourceBytes / 1024 / 1024).toFixed(2)} MiB`);
console.log(`All fallback and WebP variants: ${(generatedBytes / 1024 / 1024).toFixed(2)} MiB (${percent}% smaller)`);
