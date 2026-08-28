import { lavenderOil, oil, oil1, oil2, roseOil } from "../assets/images";
import { hydrateCatalogProducts } from './catalogHydration';

export const oilData = hydrateCatalogProducts([
    {
        id: 'oil-rose',
        image: roseOil,
    },
    {
        id: 'oil-lavender',
        image: lavenderOil,
    },
    {
        id: 'oil-olive',
        image: oil,
    },
    {
        id: 'oil-coconut',
        image: oil1,
    },
    {
        id: 'oil-tea-tree',
        image: oil2,
    },
    
]);
