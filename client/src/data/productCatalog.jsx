import { candleData } from './candleData';
import { herbsData } from './herbsData';
import { homeDecorData } from './homeDecorData';
import { oilData } from './oilData';
import { productData } from './productData';
import { wellnessData } from './wellnessData';

export const productCatalog = [
  ...productData,
  ...candleData,
  ...oilData,
  ...herbsData,
  ...homeDecorData,
  ...wellnessData,
];

export const productsById = new Map(
  productCatalog.map((product) => [product.id, product])
);
