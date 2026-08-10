import React from "react";
import { ShoppingBag, Lock, Unlock, LogOut } from "lucide-react";
import logoImg from "../assets/images/singlutenpzo_logo_1785767632220.jpg";

interface NavbarProps {
  isAdmin: boolean;
  onAdminClick: () => void;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navbar({
  isAdmin,
  onAdminClick,
  onLogout,
  activeTab,
  setActiveTab
}: NavbarProps) {
  return (
    <header className="bg-gradient-to-r from-emerald-950 via-slate-900 to-amber-950 text-white shadow-xl sticky top-0 z-50 border-b border-emerald-800/40">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group" onClick={() => setActiveTab("catalogo")}>
            <div className="relative h-10 w-10 sm:h-14 sm:w-14 rounded-2xl p-1 bg-white shadow-xl border border-amber-400/40 flex-shrink-0 group-hover:scale-105 transition-transform">
              <img
                src={logoImg}
                alt="SinGlutenpzo Logo"
                className="h-full w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-200 to-emerald-300">
                SinGlutenpzo
              </h1>
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-emerald-400">
                Sin Gluten & Postres Saludables
              </p>
            </div>
          </div>

          {/* Tab Navigation (Public vs Admin) */}
          <div className="hidden md:flex space-x-1">
            {!isAdmin ? (
              <button
                onClick={() => setActiveTab("catalogo")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === "catalogo"
                    ? "bg-blue-600/30 border border-blue-500/50 text-white shadow-md"
                    : "text-blue-200 hover:text-white hover:bg-white/5"
                }`}
              >
                Catálogo Público
              </button>
            ) : (
              <div className="flex space-x-1 bg-black/20 p-1 rounded-xl border border-white/5">
                {[
                  { id: "dashboard", label: "Dashboard" },
                  { id: "inventario", label: "Inventario" },
                  { id: "materiaprima", label: "Materia Prima & Recetas IA" },
                  { id: "ventas", label: "Ventas" },
                  { id: "clientes", label: "Clientes & Cobros" },
                  { id: "compras", label: "Compras/Deudas" },
                  { id: "gastos", label: "Gastos/Nómina" },
                  { id: "devoluciones", label: "Devoluciones" },
                  { id: "ajustes", label: "Ajustes" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                      activeTab === tab.id
                        ? "bg-blue-600 text-white shadow"
                        : "text-blue-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Admin Log / Out Button */}
          <div className="flex items-center space-x-3">
            {isAdmin ? (
              <button
                onClick={onLogout}
                className="flex items-center space-x-1 px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-lg"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir Admin</span>
              </button>
            ) : (
              <button
                onClick={onAdminClick}
                className="flex items-center space-x-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-lg"
              >
                <Lock className="h-4 w-4" />
                <span>Panel Admin</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile navigation row for Admin */}
      {isAdmin && (
        <div className="md:hidden flex items-center justify-start overflow-x-auto border-t border-blue-900/40 bg-blue-950/80 p-2 space-x-1 scrollbar-thin scrollbar-thumb-blue-900">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "inventario", label: "Inventario" },
            { id: "materiaprima", label: "Materia Prima / Recetas IA" },
            { id: "ventas", label: "Ventas" },
            { id: "clientes", label: "Clientes & Cobros" },
            { id: "compras", label: "Compras" },
            { id: "gastos", label: "Gastos" },
            { id: "devoluciones", label: "Devoluciones" },
            { id: "ajustes", label: "Ajustes" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-150 ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white border border-blue-500"
                  : "text-blue-300 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
