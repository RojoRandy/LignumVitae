// Forma publica del catalogo. El `select` del repositorio ya es lista blanca;
// esto solo aplana la imagen de portada y omite categorias vacias.
import type { PublicCatalogCategory } from '../public-catalog.repository';

export const toPublicCatalogDto = (categories: PublicCatalogCategory[]) =>
  categories
    .filter((category) => category.products.length > 0)
    .map(({ products, ...category }) => ({
      ...category,
      products: products.map(({ images, ...product }) => ({ ...product, image: images[0] ?? null })),
    }));
