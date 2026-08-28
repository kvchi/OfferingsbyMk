import { commerceCategories, commerceProducts } from '../../../shared/commerceCatalog.mjs';

const categoriesById = new Map(commerceCategories.map((category) => [category.id, category]));
const productsById = new Map(commerceProducts.map((product) => [product.id, product]));

export function hydrateCatalogProducts(uiProducts) {
  return uiProducts.map((uiProduct) => {
    const commerceProduct = productsById.get(uiProduct.id);
    if (!commerceProduct) throw new Error(`Unknown commerce product ID: ${uiProduct.id}`);

    const category = categoriesById.get(commerceProduct.categoryId);
    if (!category) throw new Error(`Unknown commerce category ID: ${commerceProduct.categoryId}`);

    return {
      ...commerceProduct,
      ...uiProduct,
      category: category.name,
      shopSection: category.slug,
      imageAlt: uiProduct.imageAlt ?? `${commerceProduct.title} product`,
    };
  });
}
