import React, { useState } from "react";
import { Product, Sale, Purchase, Expense, ReturnItem, ProductCategory, PurchaseStatus } from "../types";
import { TrendingUp, DollarSign, ArrowUpRight, ShoppingCart, UserCheck, AlertCircle, FileText, Download, Calendar } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface DashboardProps {
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  returns: ReturnItem[];
}

export default function Dashboard({
  products,
  sales,
  purchases,
  expenses,
  returns
}: DashboardProps) {
  // Configured default starting month: current month or fallback to July 2026
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const current = new Date().toISOString().slice(0, 7);
    return current;
  });

  // Get list of 12 rolling months ending in selectedMonth dynamically covering any year infinitely
  const trendMonths = (() => {
    const [yStr, mStr] = selectedMonth.split("-");
    const selectedYr = parseInt(yStr) || new Date().getFullYear();
    const selectedM = parseInt(mStr) || 1;

    const list: string[] = [];
    for (let i = 11; i >= 0; i--) {
      // Subtract i months from the selected date
      const d = new Date(selectedYr, selectedM - 1 - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      list.push(`${y}-${m}`);
    }
    return list;
  })();

  // Filter datasets by selected month
  const monthlySales = sales.filter((s) => s.month === selectedMonth);
  const monthlyPurchases = purchases.filter((p) => p.month === selectedMonth);
  const monthlyExpenses = expenses.filter((e) => e.month === selectedMonth);
  const monthlyReturns = returns.filter((r) => r.month === selectedMonth);

  // Core calculations
  const totalSalesRevenue = monthlySales.reduce((acc, s) => acc + (s.salePrice * s.quantity), 0);
  
  // Sales gross profit: only count profit proportional to the paid amount (realized profit)
  const salesGrossProfit = monthlySales.reduce((acc, s) => {
    const total = s.salePrice * s.quantity;
    const paid = s.paidAmount !== undefined ? s.paidAmount : total;
    const realizedProfit = total > 0 ? (paid / total) * s.profit : s.profit;
    return acc + realizedProfit;
  }, 0);

  // Operational expenses (payroll, utilities, rent, others)
  const totalOperatingExpenses = monthlyExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Provider Purchases (cost subtracted from liquid profit)
  // Cash purchases are subtracted immediately
  const cashPurchases = monthlyPurchases
    .filter((p) => p.type === "contado")
    .reduce((acc, p) => acc + p.totalAmount, 0);

  // Paid credit purchases are subtracted when paid
  const paidCreditPurchases = monthlyPurchases
    .filter((p) => p.type === "credito" && p.status === PurchaseStatus.Pagado)
    .reduce((acc, p) => acc + p.totalAmount, 0);

  // Debts to providers (purchases still outstanding)
  const outstandingDebts = monthlyPurchases
    .filter((p) => p.type === "credito" && p.status === PurchaseStatus.Pendiente)
    .reduce((acc, p) => acc + p.totalAmount, 0);

  // Returns logic:
  const totalRefundAmount = monthlyReturns.reduce((acc, r) => acc + r.refundAmount, 0);
  
  // Profits lost on returns: If "discountCostFromProfit" is true, subtract cost from store profits
  const returnsProfitDeduction = monthlyReturns.reduce((acc, r) => {
    if (r.discountCostFromProfit) {
      // Deduct the profit originally made (refund amount minus cost)
      const profitMade = r.refundAmount - (r.costPrice * r.quantity);
      return acc + (profitMade > 0 ? profitMade : r.refundAmount);
    }
    return acc + r.refundAmount; // Deduct full refund by default if indicated
  }, 0);

  // Net Liquid Profit (Ganancia Líquida)
  // Formula: Gross profit from sales - Cash purchases - Paid credit purchases - Operating expenses - Returns deduction
  const netLiquidProfit = salesGrossProfit - cashPurchases - paidCreditPurchases - totalOperatingExpenses - returnsProfitDeduction;

  // Pie chart data for Category sales
  const salesByProductCategory = monthlySales.reduce(
    (acc, s) => {
      if (s.category === ProductCategory.Equipos) {
        acc.equipos += s.salePrice * s.quantity;
      } else {
        acc.accesorios += s.salePrice * s.quantity;
      }
      return acc;
    },
    { equipos: 0, accesorios: 0 }
  );

  const pieData = [
    { name: "Productos Sin Gluten", value: salesByProductCategory.equipos, color: "#059669" },
    { name: "Postres Saludables", value: salesByProductCategory.accesorios, color: "#d97706" }
  ].filter(d => d.value > 0);

  // Prepare area chart data over all available months for visual report
  const trendData = trendMonths.map((m) => {
    const sMonth = sales.filter((s) => s.month === m);
    const pMonth = purchases.filter((p) => p.month === m);
    const eMonth = expenses.filter((e) => e.month === m);
    const rMonth = returns.filter((r) => r.month === m);

    const revenue = sMonth.reduce((acc, s) => acc + (s.salePrice * s.quantity), 0);
    const grossProfit = sMonth.reduce((acc, s) => {
      const total = s.salePrice * s.quantity;
      const paid = s.paidAmount !== undefined ? s.paidAmount : total;
      const realizedProfit = total > 0 ? (paid / total) * s.profit : s.profit;
      return acc + realizedProfit;
    }, 0);
    const opsExpenses = eMonth.reduce((acc, e) => acc + e.amount, 0);
    const cashP = pMonth.filter((p) => p.type === "contado").reduce((acc, p) => acc + p.totalAmount, 0);
    const paidCreditP = pMonth.filter((p) => p.type === "credito" && p.status === PurchaseStatus.Pagado).reduce((acc, p) => acc + p.totalAmount, 0);
    const retDeduct = rMonth.reduce((acc, r) => acc + r.refundAmount, 0);

    const netProfit = grossProfit - cashP - paidCreditP - opsExpenses - retDeduct;

    return {
      name: m,
      Ventas: revenue,
      "Ganancia Líquida": netProfit,
      Gastos: opsExpenses + cashP + paidCreditP
    };
  });

  // Stock alerts
  const stockOutProducts = products.filter((p) => p.stock === 0);

  // Generate PDF report
  const generatePDFReport = () => {
    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [37, 99, 235]; // Blue (Blue-600)

    // Helper to safely call autoTable on jsPDF
    const callAutoTable = (pdfDoc: any, options: any) => {
      if (typeof pdfDoc.autoTable === "function") {
        pdfDoc.autoTable(options);
      } else if (typeof autoTable === "function") {
        autoTable(pdfDoc, options);
      } else {
        // Fallback or direct registration check
        const directAutoTable = (autoTable as any).default || autoTable;
        if (typeof directAutoTable === "function") {
          directAutoTable(pdfDoc, options);
        } else {
          console.error("autoTable function not found");
        }
      }
    };

    const getLastY = (pdfDoc: any, fallback: number) => {
      if (pdfDoc.lastAutoTable && pdfDoc.lastAutoTable.finalY) {
        return pdfDoc.lastAutoTable.finalY;
      }
      return fallback;
    };

    // Title / Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("SINGLUTENPZO", 14, 18);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Oriven Distribuidora de Alimentos J-40633400-6", 14, 25);
    doc.text(`REPORTE MENSUAL DETALLADO: ${selectedMonth}`, 14, 32);

    // Metadata Right-aligned
    doc.setFontSize(8);
    doc.text("Fecha Generacion: " + new Date().toLocaleDateString(), 150, 20);
    doc.text("Moneda: USD ($)", 150, 25);
    doc.text("Acceso: Admin Privado", 150, 30);

    // Section 1: Financial Performance
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("RESUMEN FINANCIERO MENSUAL", 14, 52);

    const financialData = [
      ["Ventas Totales (Ingresos)", `$${totalSalesRevenue.toLocaleString()}`],
      ["Ganancia Bruta en Ventas", `$${salesGrossProfit.toLocaleString()}`],
      ["Gastos Operativos (Personal/Servicios)", `$${totalOperatingExpenses.toLocaleString()}`],
      ["Compras de Mercancía de Contado", `$${cashPurchases.toLocaleString()}`],
      ["Compras de Créditos Pagadas", `$${paidCreditPurchases.toLocaleString()}`],
      ["Devoluciones (Reembolsos)", `$${totalRefundAmount.toLocaleString()}`],
      ["Ganancia Líquida del Mes", `$${netLiquidProfit.toLocaleString()}`],
      ["Cuentas por Pagar (Créditos Pendientes)", `$${outstandingDebts.toLocaleString()}`]
    ];

    callAutoTable(doc, {
      startY: 56,
      head: [["Rubro Financiero", "Monto ($)"]],
      body: financialData,
      theme: "striped",
      headStyles: { fillColor: primaryColor },
      columnStyles: { 1: { halign: "right" } }
    });

    // Section 2: Sales Summary
    const currentY = getLastY(doc, 140) + 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DESGLOSE DE VENTAS POR CATEGORIA", 14, currentY);

    const categoryData = [
      ["Productos Sin Gluten", `$${salesByProductCategory.equipos.toLocaleString()}`],
      ["Postres Saludables", `$${salesByProductCategory.accesorios.toLocaleString()}`]
    ];

    callAutoTable(doc, {
      startY: currentY + 4,
      head: [["Categoría", "Total de Ventas ($)"]],
      body: categoryData,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] }, // Blue
      columnStyles: { 1: { halign: "right" } }
    });

    // Section 3: Detailed Sales List
    const currentY2 = getLastY(doc, currentY + 40) + 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DETALLE DE TRANSACCIONES DEL MES", 14, currentY2);

    const salesTableData = monthlySales.map((s) => [
      s.date,
      s.productName,
      s.category.toUpperCase(),
      s.quantity.toString(),
      `$${s.salePrice.toLocaleString()}`,
      `$${s.profit.toLocaleString()}`,
      s.customerName || "N/A"
    ]);

    callAutoTable(doc, {
      startY: currentY2 + 4,
      head: [["Fecha", "Producto", "Categoría", "Cant", "P. Venta", "Ganancia", "Cliente"]],
      body: salesTableData.length > 0 ? salesTableData : [["-", "Sin transacciones este mes", "-", "-", "-", "-", "-"]],
      theme: "striped",
      headStyles: { fillColor: [76, 29, 149] }
    });

    doc.save(`Reporte_SinGlutenpzo_${selectedMonth}.pdf`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Reportes Financieros</h2>
          <p className="text-sm text-slate-500">Monitorea las ventas, gastos y ganancia líquida mes a mes</p>
        </div>

        {/* Month Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month selector */}
          <div className="flex items-center space-x-1.5 bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-sm">
            <Calendar className="h-4.5 w-4.5 text-blue-600" />
            <select
              value={selectedMonth.split("-")[1]}
              onChange={(e) => {
                const yearStr = selectedMonth.split("-")[0];
                setSelectedMonth(`${yearStr}-${e.target.value}`);
              }}
              className="bg-transparent text-xs font-black text-slate-700 focus:outline-none cursor-pointer uppercase tracking-wider"
            >
              <option value="01">Enero</option>
              <option value="02">Febrero</option>
              <option value="03">Marzo</option>
              <option value="04">Abril</option>
              <option value="05">Mayo</option>
              <option value="06">Junio</option>
              <option value="07">Julio</option>
              <option value="08">Agosto</option>
              <option value="09">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </select>
          </div>

          {/* Year selector / stepper */}
          <div className="flex items-center space-x-1 bg-white px-2.5 py-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <button
              type="button"
              onClick={() => {
                const [yStr, mStr] = selectedMonth.split("-");
                const newY = Math.max(1000, parseInt(yStr) - 1);
                setSelectedMonth(`${newY}-${mStr}`);
              }}
              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors text-xs font-black"
              title="Año Anterior"
            >
              ◀
            </button>
            <input
              type="number"
              value={selectedMonth.split("-")[0]}
              min="1900"
              max="9999"
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 1000 && val <= 9999) {
                  const mStr = selectedMonth.split("-")[1];
                  setSelectedMonth(`${val}-${mStr}`);
                }
              }}
              className="w-16 text-center bg-transparent text-xs font-black text-slate-700 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => {
                const [yStr, mStr] = selectedMonth.split("-");
                const newY = parseInt(yStr) + 1;
                setSelectedMonth(`${newY}-${mStr}`);
              }}
              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors text-xs font-black"
              title="Año Siguiente"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      {/* Stock Alerts banner when stock is zero */}
      {stockOutProducts.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-2xl shadow-sm flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-grow">
            <h4 className="text-sm font-bold text-amber-800">Alerta de Inventario Agotado ({stockOutProducts.length} productos)</h4>
            <p className="text-xs text-amber-700 mt-1">Los siguientes artículos tienen stock en cero: </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {stockOutProducts.map((p) => (
                <span key={p.id} className="text-[10px] font-bold bg-amber-200/50 border border-amber-300 text-amber-800 px-2 py-0.5 rounded-md">
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dashboard KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Sales Revenue */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute right-0 top-0 bg-blue-50 p-6 rounded-bl-3xl group-hover:bg-blue-100/50 transition-colors">
            <ShoppingCart className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos por Ventas</p>
          <h3 className="text-2xl font-black text-slate-800 mt-2">${totalSalesRevenue.toLocaleString()}</h3>
          <p className="text-xs text-slate-400 mt-1">{monthlySales.length} ventas en {selectedMonth}</p>
        </div>

        {/* Sales Gross Profit */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute right-0 top-0 bg-sky-50 p-6 rounded-bl-3xl group-hover:bg-sky-100/50 transition-colors">
            <TrendingUp className="h-6 w-6 text-sky-600" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Utilidad Bruta Ventas</p>
          <h3 className="text-2xl font-black text-blue-950 mt-2">${salesGrossProfit.toLocaleString()}</h3>
          <p className="text-xs text-slate-400 mt-1">Ganancia antes de costos y gastos fijos</p>
        </div>

        {/* Total Expenses (Contado + Crédito Pagado + Gastos Operacionales + Devoluciones) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute right-0 top-0 bg-rose-50 p-6 rounded-bl-3xl group-hover:bg-rose-100/50 transition-colors">
            <DollarSign className="h-6 w-6 text-rose-600" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Egresos / Gastos Totales</p>
          <h3 className="text-2xl font-black text-slate-800 mt-2">
            ${(totalOperatingExpenses + cashPurchases + paidCreditPurchases + returnsProfitDeduction).toLocaleString()}
          </h3>
          <p className="text-xs text-rose-500 font-semibold mt-1">
            Incluye nómina, servicios y compras contado
          </p>
        </div>

        {/* Net Liquid Profit (Ganancia Líquida Real) */}
        <div className={`p-6 rounded-3xl border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group ${
          netLiquidProfit >= 0 ? "bg-emerald-950/5 border-emerald-100" : "bg-rose-950/5 border-rose-100"
        }`}>
          <div className={`absolute right-0 top-0 p-6 rounded-bl-3xl ${
            netLiquidProfit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          }`}>
            <ArrowUpRight className="h-6 w-6 animate-pulse" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ganancia Líquida Caja</p>
          <h3 className={`text-2xl font-black mt-2 ${netLiquidProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
            ${netLiquidProfit.toLocaleString()}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Disponible real en banco/caja</p>
        </div>
      </div>

      {/* Credit and Supplier Debts alert card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 font-extrabold uppercase px-2.5 py-1 rounded-md border border-blue-400/20">
              Cuentas por Pagar (Crédito Proveedores)
            </span>
            <h4 className="text-3xl font-black text-blue-200 mt-4">${outstandingDebts.toLocaleString()}</h4>
            <p className="text-xs text-slate-400 mt-2">
              Monto total de facturas de compra adquiridas a crédito que están pendientes de liquidación.
            </p>
          </div>
          <div className="text-xs text-slate-500 border-t border-slate-800/80 pt-3 mt-4">
            * Se debitará de la ganancia líquida cuando indiques el pago en el panel de Compras/Deudas.
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-100 font-extrabold uppercase px-2.5 py-1 rounded-md">
              Devoluciones de Clientes
            </span>
            <h4 className="text-3xl font-black text-rose-950 mt-4">${totalRefundAmount.toLocaleString()}</h4>
            <p className="text-xs text-slate-500 mt-2">
              Reembolsos por productos devueltos en {selectedMonth}. Total de eventos: {monthlyReturns.length}.
            </p>
          </div>
          <div className="text-xs text-slate-400 border-t border-slate-100 pt-3 mt-4">
            * Pérdida neta de ganancia líquida calculada según el tipo de descuento indicado.
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-sm">Historial Financiero Multimes</h4>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Últimos meses</span>
          </div>

          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`]} />
                <Legend />
                <Area type="monotone" dataKey="Ventas" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="Ganancia Líquida" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categoría Sales Pie Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Distribución por Categorías</h4>
            <p className="text-xs text-slate-400 mt-1">Productos Sin Gluten vs Postres Saludables para {selectedMonth}</p>
          </div>

          {pieData.length === 0 ? (
            <div className="text-center py-10 flex-grow flex flex-col items-center justify-center text-slate-400 text-xs">
              <span>No hay ventas registradas este mes para graficar</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex justify-center space-x-4 text-xs font-bold w-full">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center space-x-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600">{item.name}</span>
                    <span className="text-slate-400">(${item.value.toLocaleString()})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Button to generate monthly PDF report */}
      <div className="flex justify-end pt-4">
        <button
          onClick={generatePDFReport}
          className="flex items-center space-x-2 px-6 py-3.5 bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white font-extrabold text-sm uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-blue-700/20 active:scale-[0.98] transition-all"
        >
          <Download className="h-5 w-5" />
          <span>Descargar Reporte PDF Detallado ({selectedMonth})</span>
        </button>
      </div>
    </div>
  );
}
