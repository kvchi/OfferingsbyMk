import { prisma } from '../config/prisma.js';
import { synchronizeProducts } from '../commerce/catalog.js';

try {
  const result = await synchronizeProducts({ db: prisma });
  console.log(
    `Product synchronization complete: ${result.categories} categories, ${result.products} products, `
    + `${result.createdProducts} created, ${result.updatedProducts} updated.`,
  );
} finally {
  await prisma.$disconnect();
}
