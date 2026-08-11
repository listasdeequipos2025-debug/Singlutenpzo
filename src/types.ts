export enum ProductCategory {
  Equipos = "equipos",
  Accesorios = "accesorios"
}

export enum PurchaseType {
  Contado = "contado",
  Credito = "credito"
}

export enum PurchaseStatus {
  Pagado = "pagado",
  Pendiente = "pendiente"
}

export enum ExpenseCategory {
  Personal = "personal",
  Servicios = "servicios",
  Alquiler = "alquiler",
  Otros = "otros"
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  costPrice?: number; // Cost price (hidden from public)
  salePrice: number;  // Sale price
  wholesalePrice?: number; // Wholesale price (precio al mayor)
  creditPrice?: number;    // Credit price (precio a crédito)
  referenceProfit?: number; // Fallback profit if no costPrice
  stock: number;
  image?: string; // Base64 or URL
  createdAt: string;
  isBulkUploaded?: boolean;
}

export interface Sale {
  id: string;
  invoiceNumber?: string; // Consecutive invoice number starting at 000001
  controlNumber?: string; // Control number equal to invoiceNumber
  productName: string;
  productId: string;
  category: ProductCategory;
  quantity: number;
  salePrice: number;
  costPrice: number;
  profit: number;
  reference?: number; // Custom profit override (ganancia por la venta)
  customerName: string;
  customerPhone: string;
  customerCedula?: string;    // Client ID/Cédula
  customerAddress?: string;   // Client address
  customerEmail?: string;     // Client email for automatic invoice
  paymentPeriodicity?: string; // "semanal" | "quincenal" | "mensual" | "especifico"
  specificPaymentDate?: string; // YYYY-MM-DD (for "especifico" periodicity)
  installmentsCount?: number;  // Number of installments for credit sales
  initialPaymentAmount?: number; // Initial payment amount (down payment) in USD
  initialPaymentPercentage?: number; // Initial payment amount as percentage of total sale (%)
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  paymentMethod: string;
  createdAt: string;
  paidAmount?: number;
  remainingAmount?: number;
  status?: "pagado" | "pendiente";
  abonos?: {
    date: string;
    amount: number;
    paymentMethod: string;
  }[];
}

export interface PurchaseItem {
  name: string;
  category: ProductCategory;
  costPrice: number;
  quantity: number;
  salePrice: number;
}

export interface Purchase {
  id: string;
  invoiceNumber: string; // Número de factura de compra
  provider: string; // Proveedor
  providerRif?: string; // Cédula o RIF del proveedor
  providerAddress?: string; // Dirección del proveedor
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  items: PurchaseItem[];
  totalAmount: number;
  type: PurchaseType;
  status: PurchaseStatus;
  paymentDate?: string; // YYYY-MM-DD when paid
  createdAt: string;
  invoiceImage?: string; // Base64 of the invoice photo
  currency?: "USD" | "VES"; // Original currency
  bcvRate?: number; // Central Bank of Venezuela rate
  originalAmountVES?: number; // Total in VES if VES
}

export interface Provider {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  rif?: string;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  category: ExpenseCategory;
  createdAt: string;
}

export interface ReturnItem {
  id: string;
  productId: string;
  productName: string;
  category: ProductCategory;
  quantity: number;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  refundAmount: number;
  discountCostFromProfit: boolean; // whether to discount cost from store profit
  costPrice: number;
  createdAt: string;
}

export interface StoreSettings {
  pin: string;
}

export type UnitType = "kg" | "gr" | "lt" | "ml" | "unidad" | "docena" | "paquete" | "otro";

export interface RawMaterial {
  id: string;
  name: string;
  unit: UnitType;
  stock: number; // Cantidad almacenada disponible
  minStock?: number; // Alerta de stock mínimo
  costPerUnit: number; // Costo por unidad de medida (ej. $ por kg, $ por litro)
  totalCost?: number; // Costo total almacenado (stock * costPerUnit)
  supplier?: string; // Proveedor principal
  notes?: string;
  updatedAt?: string;
  createdAt: string;
}

export interface RecipeIngredient {
  id: string;
  rawMaterialId?: string; // Optional reference to RawMaterial in stock
  name: string; // Ingredient name (e.g. Harina de Arroz Sin Gluten)
  quantity: number; // Quantity in recipe (e.g. 350)
  unit: UnitType; // Recipe unit (e.g. gr)
  costPerSupplierUnit: number; // Cost per supplier unit (e.g. $4.50 per kg)
  supplierUnit: UnitType; // Supplier unit (e.g. kg)
  calculatedCost: number; // Total cost for this ingredient in recipe
}

export interface Recipe {
  id: string;
  name: string; // Nombre de la receta o postre
  yieldQuantity: number; // Cantidad que rinde (ej. 10)
  yieldUnit: string; // Unidad de rendimiento (ej. porciones, unidades, tortas)
  preparationTimeMinutes?: number; // Tiempo de preparación en mins
  description?: string;
  category?: string; // ej: Postres, Panadería, Galletas, Masas
  
  // Ingredients list
  ingredients: RecipeIngredient[];
  totalIngredientsCost: number; // Sum of calculated costs of ingredients
  
  // Overhead & Extras
  packagingCost: number; // Costo de empaque, bolsas, etiquetas, cajas
  laborCost: number; // Costo directo de mano de obra
  overheadPercentage: number; // % Gastos fijos (luz, agua, gas, alquiler, etc.)
  overheadCost: number; // Calculated overhead amount
  
  totalRecipeCost: number; // Costo total de preparación de la receta batch
  costPerUnit: number; // Costo por unidad / porción producida
  
  // Pricing Strategy
  desiredMarginPercentage: number; // Margen de ganancia deseado (ej. 60%)
  suggestedSalePricePerUnit: number; // Precio de venta sugerido por porción/unidad
  suggestedBatchSalePrice?: number; // Precio de venta total por la receta completa
  
  // AI Escandallo Analysis
  aiAnalysis?: {
    summary: string;
    profitabilityScore: number; // 1 to 100
    marketRecommendation: string;
    costReductionTips: string[];
    pricingTiers: {
      wholesale: number; // Precio al mayor
      retail: number; // Precio al detal
      credit: number; // Precio a crédito
    };
    rawMaterialUsageSummary?: string;
  };

  createdAt: string;
  updatedAt?: string;
}
