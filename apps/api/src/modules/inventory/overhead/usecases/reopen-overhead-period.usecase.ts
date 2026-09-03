// Reabre un mes cerrado por error. Antes de esto, la unica forma de
// corregir un cierre equivocado era entrar a la base de datos a mano: el
// parametro `force` de CloseOverheadPeriodUseCase existia para recalcular
// un mes ya cerrado, pero nunca fue alcanzable desde HTTP (el DTO del
// controller no lo declaraba y el ValidationPipe corre con
// forbidNonWhitelisted, asi que mandarlo devolvia 400).
//
// Reabrir NO borra el periodo: solo quita el candado (closedAt = null) y
// desactiva la depreciacion que ese cierre genero, para que un recierre
// posterior no la duplique. La tasa de gastos indirectos del catalogo
// vuelve de inmediato al Respaldo de Configuracion (o al cierre cerrado
// mas reciente anterior a este), porque RecalculateProductCostingUseCase
// solo mira `findMostRecentClosed()`.
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { UseCase } from '../../../../common/interfaces/use-case.interface';
import { InventoryErrors } from '../../../../common/errors/inventory.errors';
import { OverheadRepository } from '../overhead.repository';
import { RecalculateAllProductsUseCase } from '../../../catalog/products/usecases/recalculate-all-products.usecase';

export interface ReopenPeriodArgs {
  year: number;
  month: number;
}

@Injectable()
export class ReopenOverheadPeriodUseCase implements UseCase<ReopenPeriodArgs, unknown> {
  constructor(
    private readonly overheadRepository: OverheadRepository,
    @Inject(forwardRef(() => RecalculateAllProductsUseCase))
    private readonly recalculateAllProductsUseCase: RecalculateAllProductsUseCase,
  ) {}

  async execute(args: ReopenPeriodArgs) {
    const existing = await this.overheadRepository.findByPeriod(args.year, args.month);
    if (!existing?.closedAt) {
      throw InventoryErrors.Exceptions.OVERHEAD_PERIOD_NOT_CLOSED({ year: args.year, month: args.month });
    }

    const periodStart = new Date(Date.UTC(args.year, args.month - 1, 1));
    await this.overheadRepository.deactivateExistingDepreciation(periodStart);

    const period = await this.overheadRepository.reopen(args.year, args.month);

    // Misma razon que al cerrar: reabrir tambien cambia la tasa efectiva de
    // gastos indirectos de todo el catalogo (vuelve al respaldo o al cierre
    // anterior), asi que los precios cacheados quedarian obsoletos igual.
    await this.recalculateAllProductsUseCase.execute();

    return period;
  }
}
