import React, { useState } from "react";
import { Expense, ExpenseCategory } from "../types";
import { Search, Plus, Calendar, FileText, Trash2, DollarSign, X, AlertTriangle, AlertCircle, Download } from "lucide-react";
import * as XLSX from "xlsx";

interface ExpensesManagerProps {
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, "id" | "createdAt">) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
}

export default function ExpensesManager({
  expenses,
  onAddExpense,
  onDeleteExpense
}: ExpensesManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | ExpenseCategory>("all");

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
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.Personal);
  const [expenseDate, setExpenseDate] = useState("");
  const [formError, setFormError] = useState("");

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!description.trim() || !amount) {
      setFormError("Por favor completa todos los campos.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const finalDate = expenseDate || todayStr;
    const monthStr = finalDate.substring(0, 7); // YYYY-MM

    const expenseData = {
      description: description.trim(),
      amount: parseFloat(amount),
      category,
      date: finalDate,
      month: monthStr
    };

    try {
      await onAddExpense(expenseData);
      setShowForm(false);
      setDescription("");
      setAmount("");
      setExpenseDate("");
      setCategory(ExpenseCategory.Personal);
    } catch (err: any) {
      setFormError(err.message || "Error al guardar el gasto.");
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleExportExpensesToExcel = () => {
    const exportData = expenses.map((e) => {
      return {
        "Descripción": e.description,
        "Categoría": e.category.toUpperCase(),
        "Monto ($)": e.amount,
        "Fecha": e.date,
        "Mes": e.month
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Gastos");

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

    XLSX.writeFile(workbook, "Reporte_Gastos_SinGlutenpzo.xlsx");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gastos & Nómina</h2>
          <p className="text-sm text-slate-500">Registra pagos de personal, servicios, alquileres y egresos misceláneos</p>
        </div>

        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportExpensesToExcel}
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
            <span>Registrar Gasto</span>
          </button>
        </div>
      </div>

      {/* Manual Gasto Modal */}
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
              <DollarSign className="h-5 w-5 text-blue-600" />
              <span>Registrar Nuevo Gasto</span>
            </h3>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Descripción o Concepto</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Pago quincenal de personal o Alquiler del local"
                  className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Monto ($)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Ej: 300"
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Rubro de Gasto</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none cursor-pointer"
                  >
                    <option value={ExpenseCategory.Personal}>Nómina / Personal</option>
                    <option value={ExpenseCategory.Servicios}>Servicios Públicos</option>
                    <option value={ExpenseCategory.Alquiler}>Renta / Alquiler</option>
                    <option value={ExpenseCategory.Otros}>Otros Gastos</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Fecha del Gasto</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                />
                <p className="text-[10px] text-slate-400">Opcional: Dejar en blanco para usar la fecha de hoy</p>
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
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expenses List Panel */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar gasto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-bold transition-all outline-none"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                categoryFilter === "all" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setCategoryFilter(ExpenseCategory.Personal)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                categoryFilter === ExpenseCategory.Personal ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Personal
            </button>
            <button
              onClick={() => setCategoryFilter(ExpenseCategory.Servicios)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                categoryFilter === ExpenseCategory.Servicios ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Servicios
            </button>
            <button
              onClick={() => setCategoryFilter(ExpenseCategory.Alquiler)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                categoryFilter === ExpenseCategory.Alquiler ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Alquiler
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 bg-slate-50/50">
                <th className="p-4">Gasto / ID</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Descripción</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Monto ($)</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredExpenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-extrabold text-slate-500">
                    #{e.id.slice(0, 8)}
                  </td>
                  <td className="p-4">
                    <span className="flex items-center space-x-1 text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{e.date}</span>
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-800">
                    {e.description}
                  </td>
                  <td className="p-4 capitalize">
                    <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase">
                      {e.category}
                    </span>
                  </td>
                  <td className="p-4 font-black text-rose-500">
                    -${e.amount.toLocaleString()}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        askConfirmation(
                          "Eliminar Gasto",
                          `¿Seguro que deseas eliminar este registro de gasto?`,
                          () => {
                            onDeleteExpense(e.id);
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

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    No se encontraron gastos registrados.
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
