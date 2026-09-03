// Patron de use case del boilerplate de referencia. Se usa solo donde hay
// una operacion con reglas de negocio no triviales que vale la pena aislar
// del service (p. ej. RecalculateProductCostingUseCase,
// CloseOverheadPeriodUseCase); el CRUD simple vive directo en el service.
export interface UseCase<T, U> {
  execute(args: T): Promise<U>;
}
