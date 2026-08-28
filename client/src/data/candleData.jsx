import {  candle3, candle4, candle5, hand, soy } from "../assets/images";
import { hydrateCatalogProducts } from './catalogHydration';


export const candleData = hydrateCatalogProducts([
    {
        id: 'candle-soy-wax',
        image: soy,
    },
    {
        id: 'candle-pillar',
        image: hand,
    },
    {
        id: 'candle-massage',
        image: candle3,
    },
    {
        id: 'candle-decorative',
        image: candle4,
    },
    {
        id: 'candle-scented',
        image: candle5,
    },
]);
