import { toPublicQuotationDto } from './public-quotation.dto';

const emptyBank = { bankName: '', bankAccountHolder: '', bankClabe: '', bankCardNumber: '' };
const item = (images: { url: string; alt: string | null }[]) => ({ product: { id: 1, name: 'Vela', images }, fragranceSupply: null });
const quotation = (items: unknown[]) => ({ customer: { fullName: 'Ana', phone: null }, items }) as never;

it('bankAccount es null si no hay ningun dato de la cuenta', () => {
  expect(toPublicQuotationDto(quotation([]), emptyBank as never).bankAccount).toBeNull();
});

it('con CLABE sale la cuenta', () => {
  const dto = toPublicQuotationDto(quotation([]), { ...emptyBank, bankName: 'BBVA', bankClabe: '012345678901234567' } as never);
  expect(dto.bankAccount).toEqual({ bankName: 'BBVA', accountHolder: '', clabe: '012345678901234567', cardNumber: '' });
});

it('imageUrl toma la portada del producto o null', () => {
  const dto = toPublicQuotationDto(quotation([item([{ url: '/static/a.jpg', alt: null }]), item([])]), emptyBank as never);
  expect(dto.items.map((i) => i.imageUrl)).toEqual(['/static/a.jpg', null]);
});
