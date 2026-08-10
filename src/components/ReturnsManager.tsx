import React, { useState } from "react";
import { Product, ReturnItem } from "../types";
import { Plus, Search, Calendar, RefreshCw, Trash2, DollarSign, X, AlertTriangle, AlertCircle, Check, Download } from "lucide-react";
import * as XLSX from "xlsx";

interface ReturnsManagerProps {
  products: Product[];
  returns: ReturnItem[];
  onAddReturn: (returnItem: Omit<ReturnItem, "id" | "createdAt">) => Promise<void>;
  onDeleteReturn: (id: string) => Promise<void>;
}

export default function ReturnsManager({
  products,
  returns,
  onAddReturn,
  onDeleteReturn
}: ReturnsManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Custom Confirmation Dialog state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "blue";
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const askConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    options?: {
      confirmText?: string;
      cancelText?: string;
      type?: "danger" | "blue";
      onCancel?: () => void;
    }
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      type: options?.type || "danger",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        await onConfirm();
      },
      onCancel: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        if (options?.onCancel) {
          options.onCancel();
        }
      }
    });
  };

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [refundAmount, setRefundAmount] = useState("");
  const [discountCostFromProfit, setDiscountCostFromProfit] = useState(false);
  const [returnDate, setReturnDate] = useState("");
  const [formError, setFormError] = useState("");

  const chosenProduct = products.find((p) => p.id === selectedProductId);

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!selectedProductId) {
      setFormError("Por favor selecciona un producto.");
      return;
    }

    if (!chosenProduct) {
      setFormError("El producto seleccionado no es válido.");
      return;
    }

    const qty = parseInt(quantity, 10);
    const refund = parseFloat(refundAmount);

    if (isNaN(qty) || qty <= 0) {
      setFormError("La cantidad debe ser mayor a cero.");
      return;
    }

    if (isNaN(refund) || refund < 0) {
      setFormError("El monto reembolsado debe ser un número válido.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const finalDate = returnDate || todayStr;
    const monthStr = finalDate.substring(0, 7); // YYYY-MM

    const returnData = {
      productId: chosenProduct.id,
      productName: chosenProduct.name,
      category: chosenProduct.category,
      quantity: qty,
      date: finalDate,
      month: monthStr,
      refundAmount: refund,
      discountCostFromProfit,
      costPrice: chosenProduct.costPrice || 0
    };

    try {
      await onAddReturn(returnData);
      setShowForm(false);
      setSelectedProductId("");
      setQuantity("1");
      setRefundAmount("");
      setReturnDate("");
      setDiscountCostFromProfit(false);
    } catch (err: any) {
      setFormError(err.message || "Error al guardar devolución.");
    }
  };

  const filteredReturns = returns.filter((r) =>
    r.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportReturnsToExcel = () => {
    const exportData = returns.map((r) => {
      return {
        "Producto": r.productName,
        "Categoría": r.category.toUpperCase(),
        "Cantidad Devuelta": r.quantity,
        "Monto Reembolsado ($)": r.refundAmount,
        "Descontar Costo de Ganancia": r.discountCostFromProfit ? "Sí" : "No",
        "Precio Costo Unitario ($)": r.costPrice || 0,
        "Fecha de Devolución": r.date,
        "Mes": r.month
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Devoluciones");

    // Auto-fit columns
    const maxLens = Object.keys(exportData[0] || {}).map(key => {
      let maxLen = key.length;
      exportData.forEach(row => {
        const valStr = String((row as any)[key] ?? "");
        if (valStr.length > maxLen) {
          maxLen = valStr.length;
        }
      });
      return { wch: maxLen + 2 };
    });
    worksheet["!cols"] = maxLens;

    XLSX.writeFile(workbook, "Reporte_Devoluciones_SinGlutenpzo.xlsx");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Registro de Devoluciones</h2>
          <p className="text-sm text-slate-500">
            Gestiona productos devueltos por clientes, incrementa el stock y controla el descuento de costos de ganancia líquida
          </p>
        </div>

        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportReturnsToExcel}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-500/20 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Exportar Excel</span>
          </button>
          <button
            onClick={() => {
              setFormError("");
              setShowForm(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-blue-500/25"
          >
            <Plus className="h-4 w-4" />
            <span>Registrar Devolución</span>
          </button>
        </div>
      </div>

      {/* Manual Return Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[80] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative border border-slate-100 my-auto max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              <span>Registrar Devolución de Mercancía</span>
            </h3>

            <form onSubmit={handleCreateReturn} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Seleccionar Producto</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod) {
                      setRefundAmount(prod.salePrice.toString()); // default refund to sale price
                    }
                  }}
                  className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none cursor-pointer"
                >
                  <option value="">-- Elige un producto devuelto --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Costo: ${p.costPrice || "N/A"} - Venta: ${p.salePrice})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Cantidad Devuelta</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Monto Reembolsado ($)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Fecha de Devolución</label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                />
                <p className="text-[10px] text-slate-400">Opcional: Dejar en blanco para usar la fecha de hoy</p>
              </div>

              {/* Toggle to discount cost or not */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-700 uppercase">¿Descontar costo del producto de ganancias?</span>
                  <button
                    type="button"
                    onClick={() => setDiscountCostFromProfit(!discountCostFromProfit)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none ${
                      discountCostFromProfit ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                        discountCostFromProfit ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  Si activas esta opción, el costo original de compra de la mercancía devuelta será restado de tus ganancias líquidas (pérdida neta de inventario). Si la desactivas, solo se restará el monto devuelto al cliente y el producto regresará al stock para ser revendido.
                </p>
              </div>

              {formError && (
                <div className="flex items-center space-x-2 bg-rose-50 border border-rose-100 text-rose-600 text-xs p-3 rounded-xl">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md"
                >
                  Confirmar Devolución
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Returns List table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-6">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre de producto devuelto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-bold transition-all outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 bg-slate-50/50">
                <th className="p-4">Devolución / ID</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Producto</th>
                <th className="p-4 text-center">Cant Devuelta</th>
                <th className="p-4">Monto Reembolso</th>
                <th className="p-4">¿Descontó Costo?</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredReturns.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-extrabold text-slate-500">
                    #{r.id.slice(0, 8)}
                  </td>
                  <td className="p-4">
                    <span className="flex items-center space-x-1 text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{r.date}</span>
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{r.productName}</p>
                    <p className="text-[10px] text-blue-500 uppercase tracking-wider font-bold">{r.category}</p>
                  </td>
                  <td className="p-4 text-center font-bold text-slate-500">{r.quantity} unids</td>
                  <td className="p-4 font-black text-rose-500">
                    -${r.refundAmount.toLocaleString()}
                  </td>
                  <td className="p-4">
                    {r.discountCostFromProfit ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-[10px] uppercase font-bold tracking-wider">
                        <Check className="h-3 w-3" />
                        <span>Sí, costo descontado (${(r.costPrice * r.quantity).toLocaleString()})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                        <span>No, solo reembolso</span>
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        askConfirmation(
                          "Eliminar Devolución",
                          `¿Seguro que deseas eliminar este registro de devolución?`,
                          () => {
                            onDeleteReturn(r.id);
                          }
                        );
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredReturns.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                    No hay devoluciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scale-up">
            <div className="flex items-start space-x-3.5">
              {confirmModal.type === "blue" ? (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600 flex-shrink-0 animate-pulse">
                  <AlertCircle className="h-6 w-6" />
                </div>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 flex-shrink-0 animate-pulse">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              )}
              <div className="space-y-1.5 flex-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{confirmModal.title}</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed whitespace-pre-line">{confirmModal.message}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-50 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-rose-200"
              >
                {confirmModal.confirmText || "Sí, Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
