import { money, round2 } from './money';

export type OrderBalanceStatus = 'NONE' | 'PENDING' | 'PAID' | 'OVERPAID';

export const orderBalance = (
  total: number | string,
  paid: number | string,
): { status: OrderBalanceStatus; amount: number } => {
  // El saldo se compara en centavos enteros para evitar ruido de flotante.
  const totalCents = Math.round(Number(total) * 100);
  const paidCents = Math.round(Number(paid) * 100);
  if (totalCents <= 0) return { status: 'NONE', amount: 0 };

  const balanceCents = totalCents - paidCents;
  if (balanceCents === 0) return { status: 'PAID', amount: 0 };

  return {
    status: balanceCents > 0 ? 'PENDING' : 'OVERPAID',
    amount: round2(money(Math.abs(balanceCents)).dividedBy(100)).toNumber(),
  };
};
