// Recalcula el costeo de TODO el catalogo activo. Se dispara cuando cambia
// algo que puede afectar a mas de un producto a la vez -- aplicar el costo
// sugerido de un insumo, o cerrar/reabrir un mes (cambia la tasa de gastos
// indirectos de todo el catalogo) -- y no vale la pena calcular exactamente
// que productos usan ese insumo o esa tasa: recorrer el catalogo completo
// es barato comparado con dejar precios obsoletos en silencio, que es
// justo el bug que esto reemplaza (ver bug colateral D.1 del plan de UX).
import { Injectable, Logger } from '@nestjs/common';
import { ProductRepository } from '../product.repository';
import { RecalculateProductCostingUseCase } from './recalculate-product-costing.usecase';

@Injectable()
export class RecalculateAllProductsUseCase {
  private readonly logger = new Logger(RecalculateAllProductsUseCase.name);

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly recalculateProductCostingUseCase: RecalculateProductCostingUseCase,
  ) {}

  async execute(): Promise<void> {
    const products = await this.productRepository.findMany({ where: { isActive: true } });
    for (const product of products) {
      try {
        await this.recalculateProductCostingUseCase.execute(product.id);
      } catch (error) {
        // Un producto con datos incompletos (p. ej. un ramo sin componentes
        // todavia) no debe tumbar el recalculo del resto del catalogo.
        this.logger.warn(`No se pudo recalcular el producto #${product.id}: ${(error as Error).message}`);
      }
    }
  }
}
