// Los controllers de la API devuelven las entidades de Prisma tal cual
// (Decimal -> string y Date -> string ISO al serializar a JSON), sin DTOs de
// respuesta decorados con @ApiProperty. Por pragmatismo de tiempo, estos
// tipos se escriben a mano en vez de derivarse del OpenAPI generado (que
// solo tiene los DTOs de entrada) — es una desviacion documentada del
// patron del repo de referencia. Revisar CLAUDE.md > "Decisiones que se
// desviaron del plan" antes de asumir que esto va a cambiar solo.
export type UserRole = 'employee' | 'admin' | 'super_user';

export interface UserDto {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CandleCategoryDto {
  id: number;
  name: string;
  slug: string;
  colorHex: string;
  description: string | null;
  coverImageUrl: string | null;
  sortOrder: number;
  isVisibleOnLanding: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UnitOfMeasure = 'GRAM' | 'KILOGRAM' | 'MILLILITER' | 'LITER' | 'CENTIMETER' | 'METER' | 'PIECE' | 'SHEET';
export type SupplySource = 'CANDLE_TEMPLATE' | 'PACKAGING_TEMPLATE' | 'CARD_TEMPLATE' | 'MANUAL';

export interface SupplyDto {
  id: number;
  name: string;
  sku: string | null;
  type: string;
  unit: UnitOfMeasure;
  currentUnitCost: string;
  suggestedUnitCost: string | null;
  suggestedCostSampleSize: number;
  suggestedCostComputedAt: string | null;
  stockQty: string;
  minStockQty: string;
  defaultPackLabel: string | null;
  defaultBaseQtyPerPack: string | null;
  yieldPerBaseUnit: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyTemplateItemDto {
  id: number;
  supplyId: number;
  quantity: string;
  unit: UnitOfMeasure;
  note: string | null;
  supply: SupplyDto;
}

export interface CandleDto {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  grams: string;
  widthCm: string | null;
  heightCm: string | null;
  wastePct: string;
  meltMinutes: number;
  meltBatchGrams: number | null;
  waxSupplyId: number | null;
  moldAssetId: number | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: CandleCategoryDto;
  supplyTemplate?: SupplyTemplateItemDto[];
  waxSupply?: SupplyDto | null;
}

export interface PackagingTypeDto {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  packMinutes: number;
  setupMinutes: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  supplyTemplate?: SupplyTemplateItemDto[];
}

export interface CardTypeDto {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  widthCm: string | null;
  heightCm: string | null;
  printedSides: number;
  setupMinutes: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  supplyTemplate?: SupplyTemplateItemDto[];
}

export type ProductKind = 'SIMPLE' | 'BOUQUET';

export interface ProductSupplyDto {
  id: number;
  productId: number;
  supplyId: number;
  quantity: string;
  unit: UnitOfMeasure;
  source: SupplySource;
  note: string | null;
  supply: SupplyDto;
}

export interface ProductComponentDto {
  id: number;
  productId: number;
  candleId: number;
  quantity: number;
  sortOrder: number;
  candle: CandleDto;
}

export interface ProductImageDto {
  id: number;
  productId: number;
  url: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductCostBreakdownJson {
  waxGramsPerUnit: number;
  piecesPerMeltBatch: number;
  meltMinutesPerUnit: number;
  setupMinutesPerUnit: number;
  packMinutesPerUnit: number;
  laborMinutesPerUnit: number;
  unitWaxCost: number;
  unitSupplyCost: number;
  unitFragranceCost: number;
  unitLaborCost: number;
  unitOverheadCost: number;
  unitTotalCost: number;
}

export interface ProductCostingBasisJson {
  laborRatePerMinute: number;
  overheadRatePerMinute: number;
  overheadRateSource: string;
  waxUnitCost: number;
  meltBatchGrams: number;
  prorationQuantity: number;
  retailMarkupPct: number;
  wholesaleMarkupPct: number;
  roundingMultiple: number;
  breakdown: ProductCostBreakdownJson;
}

export interface ProductDto {
  id: number;
  sku: string;
  name: string;
  slug: string;
  kind: ProductKind;
  categoryId: number;
  candleId: number | null;
  packagingTypeId: number | null;
  cardTypeId: number | null;
  description: string | null;
  extraSetupMinutes: number;
  extraPackMinutes: number;
  assemblyMinutes: number;
  allowsFragrance: boolean;
  unitWaxCost: string;
  unitSupplyCost: string;
  unitLaborCost: string;
  unitOverheadCost: string;
  unitTotalCost: string;
  retailListPrice: string;
  wholesaleListPrice: string;
  retailPriceOverride: string | null;
  wholesalePriceOverride: string | null;
  costingBasis: ProductCostingBasisJson | null;
  costingComputedAt: string | null;
  needsReview: boolean;
  reviewNote: string | null;
  isVisibleOnLanding: boolean;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: CandleCategoryDto;
  candle?: CandleDto | null;
  packagingType?: PackagingTypeDto | null;
  cardType?: CardTypeDto | null;
  supplies?: ProductSupplyDto[];
  components?: ProductComponentDto[];
  images?: ProductImageDto[];
}

export type QuotationStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
export type OrderStatus = 'PENDING_DEPOSIT' | 'CONFIRMED' | 'IN_PRODUCTION' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type PriceTierValue = 'RETAIL' | 'WHOLESALE';
export type PaymentMethodValue = 'CASH' | 'TRANSFER' | 'CARD' | 'OTHER';
export type AdjustmentTypeValue = 'PERCENTAGE' | 'FIXED';

export interface CustomerDto {
  id: number;
  fullName: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SalesLineItemCostFields {
  waxGramsPerUnit: string;
  laborMinutesPerUnit: string;
  unitWaxCost: string;
  unitSupplyCost: string;
  unitFragranceCost: string;
  unitLaborCost: string;
  unitOverheadCost: string;
  unitTotalCost: string;
  unitListPrice: string;
  unitPrice: string;
  priceVariance: string;
  lineTotal: string;
  lineCost: string;
  lineMargin: string;
}

export interface QuotationItemDto extends SalesLineItemCostFields {
  id: number;
  quotationId: number;
  productId: number;
  sortOrder: number;
  quantity: number;
  candleColor: string | null;
  ribbonColor: string | null;
  withFragrance: boolean;
  fragranceName: string | null;
  personalizationText: string | null;
  setupMinutesOverride: number | null;
  product?: { id: number; name: string };
}

export interface QuotationDto {
  id: number;
  folio: string;
  status: QuotationStatus;
  customerId: number;
  createdById: number | null;
  issuedAt: string;
  validUntil: string;
  eventDate: string | null;
  priceTier: PriceTierValue;
  totalQuantity: number;
  totalWaxGrams: string;
  subtotal: string;
  discountEnabled: boolean;
  discountType: AdjustmentTypeValue;
  discountValue: string;
  discountAmount: string;
  shippingCost: string;
  total: string;
  depositAmount: string;
  totalCost: string;
  grossProfit: string;
  grossMarginPct: string;
  currency: string;
  notes: string | null;
  terms: string | null;
  publicToken: string;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  customer?: CustomerDto;
  items?: QuotationItemDto[];
  order?: { id: number; folio: string } | null;
}

export interface OrderItemDto extends SalesLineItemCostFields {
  id: number;
  orderId: number;
  productId: number;
  sortOrder: number;
  productName: string;
  quantity: number;
  candleColor: string | null;
  ribbonColor: string | null;
  withFragrance: boolean;
  fragranceName: string | null;
  personalizationText: string | null;
}

export interface PaymentDto {
  id: number;
  folio: string;
  orderId: number;
  amount: string;
  method: PaymentMethodValue;
  isDeposit: boolean;
  reference: string | null;
  paidAt: string;
  notes: string | null;
  receivedById: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderDto {
  id: number;
  folio: string;
  quotationId: number | null;
  customerId: number;
  status: OrderStatus;
  orderDate: string;
  dueDate: string;
  deliveredAt: string | null;
  cancelledAt: string | null;
  priceTier: PriceTierValue;
  totalQuantity: number;
  totalWaxGrams: string;
  subtotal: string;
  discountAmount: string;
  shippingCost: string;
  total: string;
  paidAmount: string;
  depositAmount: string;
  totalSupplyCost: string;
  totalLaborCost: string;
  totalOverheadCost: string;
  totalCost: string;
  grossProfit: string;
  currency: string;
  notes: string | null;
  createdById: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  customer?: CustomerDto;
  items?: OrderItemDto[];
  payments?: PaymentDto[];
  quotation?: { id: number; folio: string } | null;
}

export interface QuotationTotalsPreview {
  priceTier: PriceTierValue;
  totalQuantity: number;
  items: { unitListPrice: number; unitPrice: number; priceVariance: number; lineTotal: number; lineCost: number; lineMargin: number }[];
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
  depositAmount: number;
  totalCost: number;
  grossProfit: number;
  grossMarginPct: number;
}

export interface PreviewQuotationTotalsResult {
  totals: QuotationTotalsPreview;
  items: { unitTotalCost: number }[];
}

export interface SalesStatsDto {
  activeQuotations: number;
  pendingOrders: number;
  readyOrders: number;
  revenueThisMonth: string;
  upcomingDeliveries: OrderDto[];
}

export type PurchaseLineKind = 'SUPPLY' | 'ASSET' | 'EXPENSE';
export type AssetKind = 'MOLD' | 'TOOL' | 'EQUIPMENT';
export type ExpenseKind = 'OVERHEAD' | 'NON_OPERATING';

export interface PurchaseItemDto {
  id: number;
  purchaseId: number;
  kind: PurchaseLineKind;
  description: string;
  supplyId: number | null;
  assetId: number | null;
  expenseCategoryId: number | null;
  packsQty: string;
  baseQtyPerPack: string;
  pricePerPack: string;
  lineTotal: string;
  baseQuantity: string;
  baseUnitCost: string;
  landedUnitCost: string;
  allocatedShipping: string;
}

export interface PurchaseDto {
  id: number;
  folio: string;
  purchasedAt: string;
  platform: string | null;
  supplierName: string | null;
  reference: string | null;
  shippingCost: string;
  subtotal: string;
  total: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: PurchaseItemDto[];
}

export interface AssetDto {
  id: number;
  name: string;
  kind: AssetKind;
  acquiredAt: string;
  quantity: number;
  unitCost: string;
  totalCost: string;
  salvageValue: string;
  usefulLifeMonths: number;
  retiredAt: string | null;
  imageUrl: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategoryDto {
  id: number;
  name: string;
  kind: ExpenseKind;
  isActive: boolean;
}

export interface ExpenseDto {
  id: number;
  categoryId: number;
  source: 'MANUAL' | 'PURCHASE' | 'DEPRECIATION';
  description: string;
  amount: string;
  periodMonth: string;
  incurredAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: ExpenseCategoryDto;
}

export interface OverheadPeriodDto {
  id: number;
  year: number;
  month: number;
  expenseTotal: string;
  producedMinutes: string;
  producedUnits: number;
  producedGrams: string;
  ratePerMinute: string;
  rateSource: 'DERIVED' | 'FALLBACK' | 'CLAMPED';
  ratePerUnit: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsDto {
  id: number;
  legalName: string;
  brandName: string;
  logoUrl: string | null;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  state: string;
  businessHours: string;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  timezone: string;
  currency: string;
  minLeadTimeDays: number;
  depositPct: string;
  quotationValidityDays: number;
  dailyWage: string;
  workHoursPerDay: number;
  meltBatchGrams: number;
  defaultWastePct: string;
  waxSupplyId: number | null;
  fragranceSupplyId: number | null;
  fragranceLoadPct: string;
  fragranceSurcharge: string;
  overheadRateMode: 'DERIVED' | 'FIXED';
  overheadRatePerMinute: string;
  overheadMinSampleMinutes: number;
  overheadMaxDeviationPct: string;
  retailMarkupPct: string;
  wholesaleMarkupPct: string;
  wholesaleThresholdQty: number;
  minMarginPct: string;
  roundingMultiple: string;
  supplyCostWindowDays: number;
  supplyCostMaxSamples: number;
  supplyCostAlertPct: string;
  defaultAssetUsefulLifeMonths: number;
  quotationTerms: string;
  quotationFooterNote: string;
  orderPolicyText: string;
  quotationFolioPrefix: string;
  orderFolioPrefix: string;
  purchaseFolioPrefix: string;
  paymentFolioPrefix: string;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface SupplyCostDriftEntry {
  supply: SupplyDto;
  driftPct: number;
}

export interface LowStockSupplyRow {
  id: number;
  name: string;
  stock_qty: string;
  min_stock_qty: string;
  unit: UnitOfMeasure;
}
