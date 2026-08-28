import {crystals, difuser, mat, roller, stick } from "../assets/images";
import { hydrateCatalogProducts } from './catalogHydration';


export const wellnessData = hydrateCatalogProducts([
    {
        id: 'wellness-meditation-crystals',
        image: crystals,
    },
    {
        id: 'wellness-aromatic-diffusers',
        image: difuser,
    },
    {
        id: 'wellness-face-rollers',
        image: roller,
    },
    {
        id: 'wellness-yoga-mats',
        image: mat,
    },
    {
        id: 'wellness-incense-sticks',
        image: stick,
    },
]);
