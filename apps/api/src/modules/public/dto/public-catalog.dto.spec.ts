import type { PublicCatalogCategory } from '../public-catalog.repository';
import { toPublicCatalogDto } from './public-catalog.dto';

it('marca solo novedades vigentes y omite newUntil en la respuesta publica', () => {
  const now = Date.now();
  const category: PublicCatalogCategory = {
    id: 1,
    name: 'Velas',
    slug: 'velas',
    description: null,
    colorHex: '#7A5C3E',
    coverImageUrl: null,
    products: [new Date(now + 86_400_000), new Date(now - 86_400_000), null].map((newUntil, index) => ({
      id: index + 1,
      name: `Vela ${index + 1}`,
      slug: `vela-${index + 1}`,
      kind: 'SIMPLE',
      description: null,
      isFeatured: false,
      newUntil,
      allowsFragrance: true,
      images: [],
      candle: null,
      components: [],
      packagingType: null,
    })),
  };

  const [result] = toPublicCatalogDto([category]);

  expect(result.products.map((product) => product.isNew)).toEqual([true, false, false]);
  for (const product of result.products) {
    expect(product).not.toHaveProperty('newUntil');
  }
});
