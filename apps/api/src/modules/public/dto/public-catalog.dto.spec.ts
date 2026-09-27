import { Prisma } from '@prisma/client';
import type { PublicCatalogCategory, PublicProduct } from '../public-catalog.repository';
import { toPublicCatalogDto, toPublicProductDto } from './public-catalog.dto';

const noPrices = {
  retailListPrice: new Prisma.Decimal(0),
  wholesaleListPrice: new Prisma.Decimal(0),
  retailPriceOverride: null,
  wholesalePriceOverride: null,
};

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
      updatedAt: new Date(now),
      allowsFragrance: true,
      images: [],
      candle: null,
      components: [],
      packagingType: null,
      ...noPrices,
    })),
  };

  const [result] = toPublicCatalogDto([category]);

  expect(result.products.map((product) => product.isNew)).toEqual([true, false, false]);
  for (const product of result.products) {
    expect(product).not.toHaveProperty('newUntil');
    expect(product.updatedAt).toEqual(new Date(now));
  }
});

it('publica el precio efectivo de menudeo y mayoreo sin filtrar los campos crudos', () => {
  const product: PublicProduct = {
    id: 1,
    name: 'Vela',
    slug: 'vela',
    kind: 'SIMPLE',
    description: null,
    allowsFragrance: true,
    category: { name: 'Velas', slug: 'velas' },
    images: [],
    supplies: [],
    retailListPrice: new Prisma.Decimal(120),
    wholesaleListPrice: new Prisma.Decimal(95),
    retailPriceOverride: new Prisma.Decimal(130),
    wholesalePriceOverride: null,
  };

  const result = toPublicProductDto(product);

  expect(result.prices).toEqual({ retail: 130, wholesale: 95 });
  for (const key of ['retailListPrice', 'wholesaleListPrice', 'retailPriceOverride', 'wholesalePriceOverride']) {
    expect(result).not.toHaveProperty(key);
  }
});

it('un precio en 0 (producto sin costear) sale como null', () => {
  const category: PublicCatalogCategory = {
    id: 1,
    name: 'Velas',
    slug: 'velas',
    description: null,
    colorHex: '#7A5C3E',
    coverImageUrl: null,
    products: [{
      id: 1,
      name: 'Vela',
      slug: 'vela',
      kind: 'SIMPLE',
      description: null,
      isFeatured: false,
      newUntil: null,
      updatedAt: new Date(),
      allowsFragrance: true,
      images: [],
      candle: null,
      components: [],
      packagingType: null,
      ...noPrices,
    }],
  };

  const [result] = toPublicCatalogDto([category]);

  expect(result.products[0].prices).toEqual({ retail: null, wholesale: null });
  expect(result.products[0]).not.toHaveProperty('retailListPrice');
});
