import { homeDecor, homeDecor1, vase2, vase3, vase4 } from "../assets/images";
import { hydrateCatalogProducts } from './catalogHydration';


export const homeDecorData = hydrateCatalogProducts([
    {
        id: 'decor-pink-vase',
        image:vase2 ,
    },
    {
        id: 'decor-ceramic-vase',
        image:vase3 ,
    },
    {
        id: 'decor-harmony-vase',
        image:vase4 ,
    },
    {
        id: 'decor-ceramic-chandeliers',
        image:homeDecor ,
    },
    {
        id: 'decor-floor-vase',
        image:homeDecor1 ,
    },
]);
