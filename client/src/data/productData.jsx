import { rosemary, lavender, candle, vase2 } from '../assets/images'
import { hydrateCatalogProducts } from './catalogHydration';

export const productData = hydrateCatalogProducts([
    {
        id: 'featured-rosemary',
        image: rosemary,
        aosDelay: '0',
    },
    {
        id: 'featured-lavender',
        image: lavender,
        aosDelay: '200',
    },
    {
        id: 'featured-vase',
        image: vase2,
        aosDelay: '400',
    },
    {
        id: 'featured-candles',
        image: candle,
        aosDelay: '600',
    }
]);
