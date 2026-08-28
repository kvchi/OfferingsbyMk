import { oregano, rosemary, sage1, sage3, sage4 } from "../assets/images";
import { hydrateCatalogProducts } from './catalogHydration';


export const herbsData = hydrateCatalogProducts([
    {
        id: 'herb-melissa',
        image: sage3,
    },
    {
        id: 'herb-smudge-sticks',
        image: sage1,
    },
    {
        id: 'herb-oregano',
        image: oregano,
    },
    {
        id: 'herb-lavender',
        image: sage4,
    },
    {
        id: 'herb-rosemary',
        image: rosemary,
    },
]);
