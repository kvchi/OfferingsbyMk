# ShopSphare image performance audit

## Measurement scope

The repository was clean at the start of this phase. Chrome DevTools performance tooling was not connected, so no browser-derived LCP, CLS, FCP, TBT, request count, or transferred-byte value is claimed here. Transfer figures below are static upper-bound calculations from the markup and source file sizes; native lazy-loading heuristics, HTTP caching, and responsive candidate selection can change real transfers.

Baseline production build:

- JavaScript: one `971.43 kB` chunk (`273.09 kB` gzip), plus Vite's greater-than-500 kB warning.
- CSS: `67.75 kB` (`10.46 kB` gzip).
- Original raster corpus in `src/assets/images`: 62 files, 122,286,072 bytes (116.62 MiB).
- Home exposed 15 unique eager local images totalling 32,648,905 bytes (31.14 MiB), plus seven remote testimonial avatars.
- Shop exposed 29 unique eager local images totalling 54,835,226 bytes (52.29 MiB).

## Used-image inventory

“Baseline load” describes the code before this phase. All local rows now use responsive fallback/WebP candidates, intrinsic dimensions, and async decoding. “LCP” is a static likelihood, not a browser measurement.

| Source | Format / dimensions | Original bytes | Use | Fold / likely LCP | Baseline load | Optimized loading |
|---|---:|---:|---|---|---|---|
| `man.jpg` | JPG 4987×3325 | 7,543,017 | Home hero slide 1 | Above / yes | eager | eager, high priority |
| `atmcard.jpg` | JPG 5472×3648 | 1,073,312 | Home hero slide 2 | Above / no | eager | lazy, low priority |
| `shopingCart.jpg` | JPG 4896×3264 | 7,295,786 | Home hero slide 3 | Above / no | eager | lazy, low priority |
| `womanSage.jpg` | JPG 6720×4480 | 1,918,472 | Home hero slide 4 | Above / no | eager | lazy, low priority |
| `sage2.jpg` | JPG 5368×3020 | 1,839,562 | Home hero slide 5 | Above / no | eager | lazy, low priority |
| `candle5.jpg` | JPG 6000×4000 | 2,293,101 | Shop hero 1; candle/category card | Above in hero / yes there | eager | hero eager/high; cards lazy |
| `lavenderOil.jpg` | JPG 4608×3072 | 503,646 | Shop hero 2; oil/category card | Above in hero / no | eager | hero lazy/low; cards lazy |
| `sage1.jpg` | JPG 6720×4480 | 1,253,937 | Shop hero 3; herb/category card | Above in hero / no | eager | hero lazy/low; cards lazy |
| `buddha.jpg` | JPG 6720×4480 | 1,463,480 | Shop hero 4; decor category | Above in hero / no | eager | hero lazy/low; category lazy |
| `wellness.jpg` | JPG 3584×5376 | 13,541,253 | Shop hero 5; wellness category | Above in hero / no | eager | hero lazy/low; category lazy |
| `rosemary.jpg` | JPG 1080×1080 | 114,689 | Featured product; herb product | Below / no | eager | lazy |
| `lavender.jpg` | JPG 1080×1080 | 90,431 | Featured product | Below / no | eager | lazy |
| `vase2.jpg` | JPG 2878×4316 | 520,587 | Featured product; decor product | Below / no | eager | lazy |
| `candle.jpg` | JPG 4409×2940 | 8,153,935 | Featured product; About hero background | Below on Home; above on About / About candidate | eager | card lazy; About eager/high |
| `soy.jpg` | JPG 3987×5980 | 2,259,549 | Candle product | Below / no | eager | lazy |
| `hand.jpg` | JPG 2597×3895 | 649,055 | Candle product | Below / no | eager | lazy |
| `candle3.jpg` | JPG 8192×8192 | 1,776,869 | Candle product; favicon source | Below / no | eager; original favicon | card lazy; dedicated 64 px favicon |
| `candle4.jpg` | JPG 5304×7952 | 3,049,005 | Candle product | Below / no | eager | lazy |
| `roseOil.jpg` | JPG 6568×4379 | 916,545 | Oil product | Below / no | eager | lazy |
| `oil.jpg` | JPG 3500×3500 | 1,393,992 | Oil product | Below / no | eager | lazy |
| `oil1.jpg` | JPG 4193×2795 | 650,891 | Oil product | Below / no | eager | lazy |
| `oil2.jpg` | JPG 4016×5224 | 981,546 | Oil product | Below / no | eager | lazy |
| `sage3.jpg` | JPG 4250×5312 | 2,663,167 | Herb product | Below / no | eager | lazy |
| `oregano.jpg` | JPG 4000×5031 | 2,616,779 | Herb product | Below / no | eager | lazy |
| `sage4.jpg` | JPG 3712×5568 | 1,257,582 | Herb product | Below / no | eager | lazy |
| `vase3.jpg` | JPG 3000×4000 | 1,442,932 | Decor product | Below / no | eager | lazy |
| `vase4.jpg` | JPG 3378×4831 | 508,113 | Decor product | Below / no | eager | lazy |
| `homeDecor.jpg` | JPG 2099×2623 | 431,573 | Decor product | Below / no | eager | lazy |
| `homeDecor1.jpg` | JPG 2848×4272 | 601,343 | Decor product | Below / no | eager | lazy |
| `crystals.jpg` | JPG 3648×5472 | 1,625,252 | Wellness product | Below / no | eager | lazy |
| `difuser.jpg` | JPG 3712×5568 | 413,108 | Wellness product | Below / no | eager | lazy |
| `roller.jpg` | JPG 3648×5472 | 937,511 | Wellness product | Below / no | eager | lazy |
| `mat.jpg` | JPG 5617×3744 | 2,187,737 | Wellness product | Below / no | eager | lazy |
| `stick.jpg` | JPG 3360×5040 | 537,618 | Wellness product | Below / no | eager | lazy |
| `candle2.png` | PNG 1333×2000 | 536,400 | Home top-products art | Below / no | eager | lazy |
| `rosemarybg.png` | PNG 500×500 | 227,392 | Home top-products art | Below / no | eager | lazy |
| `lavenderbg.png` | PNG 500×500 | 201,947 | Home top-products art | Below / no | eager | lazy |
| `vase.png` | PNG 500×500 | 117,048 | Home top-products art | Below / no | eager | lazy |
| `incense.jpg` | JPG 7448×4968 | 2,798,516 | Home promotion | Below / no | eager | lazy |
| `scentedCandles.jpg` | JPG 3000×2000 | 217,811 | Home newsletter; About sections | Below / no | eager | lazy |
| `light1.jpg` | JPG 6000×4000 | 1,617,799 | Login/Forgot/Reset background | Above / yes | eager | eager, high priority |
| Picsum `101`–`107` | remote JPEG, 200×200 URL | remote | Home testimonials | Below / no | eager | lazy, 80×80 intrinsic size |
| `MdPanoramaPhotosphere` | vector React icon | n/a | Header/Footer logo | Above / no | inline vector | unchanged |

Every product-detail route reuses its canonical product descriptor. Its main image is above the fold, eager/high-priority, and receives a 320/640 candidate set sized for the 300 px layout. Product cards, category cards, and cart thumbnails select from the same descriptor without duplicating catalog definitions.

## Largest generated WebP candidate per used original

The comparison is original bytes versus the largest generated WebP candidate. Smaller responsive candidates and compatible JPEG/PNG fallbacks are also generated. Savings combine format conversion and right-sizing, which is the intended comparison for delivered assets.

| Source | Largest WebP | Bytes | Saving |
|---|---:|---:|---:|
| `atmcard.jpg` | 800w | 9,818 | 99.1% |
| `buddha.jpg` | 1280w | 36,736 | 97.5% |
| `candle.jpg` | 1280w | 24,944 | 99.7% |
| `candle2.png` | 512w | 77,876 | 85.5% |
| `candle3.jpg` | 640w | 12,488 | 99.3% |
| `candle4.jpg` | 640w | 10,422 | 99.7% |
| `candle5.jpg` | 1280w | 22,550 | 99.0% |
| `crystals.jpg` | 640w | 15,546 | 99.0% |
| `difuser.jpg` | 640w | 15,084 | 96.3% |
| `hand.jpg` | 640w | 12,548 | 98.1% |
| `homeDecor.jpg` | 640w | 32,070 | 92.6% |
| `homeDecor1.jpg` | 640w | 22,370 | 96.3% |
| `incense.jpg` | 800w | 17,276 | 99.4% |
| `lavender.jpg` | 640w | 18,288 | 79.8% |
| `lavenderbg.png` | 500w | 99,424 | 50.8% |
| `lavenderOil.jpg` | 1280w | 36,092 | 92.8% |
| `light1.jpg` | 1280w | 26,132 | 98.4% |
| `man.jpg` | 800w | 29,992 | 99.6% |
| `mat.jpg` | 640w | 22,486 | 99.0% |
| `oil.jpg` | 640w | 9,456 | 99.3% |
| `oil1.jpg` | 640w | 10,084 | 98.5% |
| `oil2.jpg` | 640w | 22,094 | 97.7% |
| `oregano.jpg` | 640w | 88,544 | 96.6% |
| `roller.jpg` | 640w | 10,808 | 98.8% |
| `rosemary.jpg` | 640w | 25,846 | 77.5% |
| `rosemarybg.png` | 500w | 121,790 | 46.4% |
| `roseOil.jpg` | 640w | 12,152 | 98.7% |
| `sage1.jpg` | 1280w | 34,112 | 97.3% |
| `sage2.jpg` | 800w | 35,180 | 98.1% |
| `sage3.jpg` | 640w | 42,642 | 98.4% |
| `sage4.jpg` | 640w | 64,170 | 94.9% |
| `scentedCandles.jpg` | 1280w | 27,092 | 87.6% |
| `shopingCart.jpg` | 800w | 20,216 | 99.7% |
| `soy.jpg` | 640w | 29,614 | 98.7% |
| `stick.jpg` | 640w | 28,574 | 94.7% |
| `vase.png` | 500w | 65,096 | 44.4% |
| `vase2.jpg` | 640w | 27,826 | 94.7% |
| `vase3.jpg` | 640w | 28,718 | 98.0% |
| `vase4.jpg` | 640w | 14,676 | 97.1% |
| `wellness.jpg` | 1280w | 119,288 | 99.1% |
| `womanSage.jpg` | 800w | 12,664 | 99.3% |

All 174 generated fallback/WebP files total 4,948,477 bytes (4.72 MiB), 93.8% below the 76.51 MiB occupied by the 41 selected originals. AVIF was deliberately not added: WebP plus existing-format fallbacks already produces large savings, while a third candidate family would add build output and maintenance without browser evidence of a meaningful incremental win.

Generation is reproducible with `npm run images:generate`. The local dev-only `sharp` dependency uses JPEG quality 78 (progressive mozjpeg), photographic WebP quality 75/effort 6, lossless WebP for PNG-derived transparent art, and PNG compression level 9 with adaptive filtering. Requested widths are layout-derived: 320/640 for cards and detail views, 480/800 for the 400 px Home hero, 640/1280 for full-width and split-screen imagery, 256/500 or 512 for transparent art, and 64 for the favicon. The script rejects upscaling and writes only to `src/assets/images/optimized`.

## Duplicate and preserved unused originals

Identical-data duplicates:

- `src/assets/images/candle3.jpg` and `public/candle3.jpg` (same SHA-256, 1,776,869 bytes each).
- `src/assets/images/crystals.jpg` and `src/assets/images/sage6.jpg` (same SHA-256, 1,625,252 bytes each).

The favicon now references the generated 64 px image, but `public/candle3.jpg` is preserved and therefore is still copied by Vite as unused public output. No original was deleted.

Originals with no current application reference, preserved for an explicit later cleanup decision: `burning.jpg`, `crystal.png`, `vase1.jpg`, `sage5.jpg`, `sage6.jpg`, `sageBurning.jpg`, `soy2.jpg`, `drink.jpg`, `herbs2.jpg`, `wellness1.jpg`, `wellness2.jpg`, `crystals2.jpg`, `crystals3.jpg`, `diffuser1.jpg`, `mat1.jpg`, `mat2.jpg`, `roller1.jpg`, `roller2.jpg`, `roller3.jpg`, and `tray.jpg`. The starter `react.svg` and public `vite.svg` also appear unused.
