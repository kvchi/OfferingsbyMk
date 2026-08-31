const optimizedAssets = import.meta.glob('./optimized/*.{jpg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const assetUrl = (filename) => {
  const url = optimizedAssets[`./optimized/${filename}`];
  if (!url) throw new Error(`Missing generated image asset: ${filename}`);
  return url;
};

const responsiveImage = (source, widths, sourceWidth, sourceHeight, fallbackFormat = 'jpg') => {
  const stem = source.replace(/\.[^.]+$/, '');
  const largestWidth = widths.at(-1);
  const height = Math.round((sourceHeight / sourceWidth) * largestWidth);
  const candidates = (format) => widths
    .map((width) => `${assetUrl(`${stem}-${width}.${format}`)} ${width}w`)
    .join(', ');

  return Object.freeze({
    source: `src/assets/images/${source}`,
    src: assetUrl(`${stem}-${largestWidth}.${fallbackFormat}`),
    srcSet: candidates(fallbackFormat),
    webpSrcSet: candidates('webp'),
    width: largestWidth,
    height,
  });
};

export const atmcard = responsiveImage('atmcard.jpg', [480, 800], 5472, 3648);
export const buddha = responsiveImage('buddha.jpg', [640, 1280], 6720, 4480);
export const candle = responsiveImage('candle.jpg', [320, 640, 1280], 4409, 2940);
export const candle2 = responsiveImage('candle2.png', [256, 512], 1333, 2000, 'png');
export const candle3 = responsiveImage('candle3.jpg', [64, 320, 640], 8192, 8192);
export const candle4 = responsiveImage('candle4.jpg', [320, 640], 5304, 7952);
export const candle5 = responsiveImage('candle5.jpg', [320, 640, 1280], 6000, 4000);
export const crystals = responsiveImage('crystals.jpg', [320, 640], 3648, 5472);
export const difuser = responsiveImage('difuser.jpg', [320, 640], 3712, 5568);
export const hand = responsiveImage('hand.jpg', [320, 640], 2597, 3895);
export const homeDecor = responsiveImage('homeDecor.jpg', [320, 640], 2099, 2623);
export const homeDecor1 = responsiveImage('homeDecor1.jpg', [320, 640], 2848, 4272);
export const incense = responsiveImage('incense.jpg', [480, 800], 7448, 4968);
export const lavender = responsiveImage('lavender.jpg', [320, 640], 1080, 1080);
export const lavenderbg = responsiveImage('lavenderbg.png', [256, 500], 500, 500, 'png');
export const lavenderOil = responsiveImage('lavenderOil.jpg', [320, 640, 1280], 4608, 3072);
export const light1 = responsiveImage('light1.jpg', [640, 1280], 6000, 4000);
export const man = responsiveImage('man.jpg', [480, 800], 4987, 3325);
export const mat = responsiveImage('mat.jpg', [320, 640], 5617, 3744);
export const oil = responsiveImage('oil.jpg', [320, 640], 3500, 3500);
export const oil1 = responsiveImage('oil1.jpg', [320, 640], 4193, 2795);
export const oil2 = responsiveImage('oil2.jpg', [320, 640], 4016, 5224);
export const oregano = responsiveImage('oregano.jpg', [320, 640], 4000, 5031);
export const roller = responsiveImage('roller.jpg', [320, 640], 3648, 5472);
export const rosemary = responsiveImage('rosemary.jpg', [320, 640], 1080, 1080);
export const rosemarybg = responsiveImage('rosemarybg.png', [256, 500], 500, 500, 'png');
export const roseOil = responsiveImage('roseOil.jpg', [320, 640], 6568, 4379);
export const sage1 = responsiveImage('sage1.jpg', [320, 640, 1280], 6720, 4480);
export const sage2 = responsiveImage('sage2.jpg', [480, 800], 5368, 3020);
export const sage3 = responsiveImage('sage3.jpg', [320, 640], 4250, 5312);
export const sage4 = responsiveImage('sage4.jpg', [320, 640], 3712, 5568);
export const scentedCandles = responsiveImage('scentedCandles.jpg', [640, 1280], 3000, 2000);
export const shopingCart = responsiveImage('shopingCart.jpg', [480, 800], 4896, 3264);
export const soy = responsiveImage('soy.jpg', [320, 640], 3987, 5980);
export const stick = responsiveImage('stick.jpg', [320, 640], 3360, 5040);
export const vase = responsiveImage('vase.png', [256, 500], 500, 500, 'png');
export const vase2 = responsiveImage('vase2.jpg', [320, 640], 2878, 4316);
export const vase3 = responsiveImage('vase3.jpg', [320, 640], 3000, 4000);
export const vase4 = responsiveImage('vase4.jpg', [320, 640], 3378, 4831);
export const wellness = responsiveImage('wellness.jpg', [640, 1280], 3584, 5376);
export const womanSage = responsiveImage('womanSage.jpg', [480, 800], 6720, 4480);
