import { describe, expect, it } from 'vitest';
import { orderBalance } from './order-balance';

describe('orderBalance: saldo del pedido en centavos enteros', () => {
  it('devuelve el saldo pendiente', () => {
    expect(orderBalance(51, 10)).toEqual({ status: 'PENDING', amount: 41 });
  });

  it('marca como pagado un pedido sin saldo', () => {
    expect(orderBalance(51, 51)).toEqual({ status: 'PAID', amount: 0 });
  });

  it('devuelve el excedente positivo cuando se paga de mas', () => {
    expect(orderBalance(51, 60)).toEqual({ status: 'OVERPAID', amount: 9 });
  });

  it.each([0, -1])('un total de %s no tiene saldo', (total) => {
    expect(orderBalance(total, 0)).toEqual({ status: 'NONE', amount: 0 });
  });

  it('acepta cadenas decimales sin ruido de flotante', () => {
    expect(orderBalance('51.00', '10.10')).toEqual({ status: 'PENDING', amount: 40.9 });
  });
});
