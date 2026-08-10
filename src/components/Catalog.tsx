import React, { useState, useEffect } from "react";
import { Product, ProductCategory } from "../types";
import {
  Search, Wheat, Cake, ShoppingBag, Grid, AlertTriangle, Plus, Minus,
  Trash2, ShoppingCart, X, User, Phone, FileText, MapPin, Check, MessageSquare, Mail
} from "lucide-react";
import logoImg from "../assets/images/singlutenpzo_logo_1785767632220.jpg";
import bgImg from "../assets/images/singlutenpzo_bg_1785767621918.jpg";

interface CatalogProps {
  products: Product[];
  whatsappNumber: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function Catalog({ products, whatsappNumber }: CatalogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "equipos" | "accesorios">("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");

  // Reset brand filter when category changes
  useEffect(() => {
    setSelectedBrand("all");
  }, [categoryFilter]);

  // Brand / Line classification helper for gluten free products & healthy desserts
  const getProductBrand = (productName: string): string => {
    const name = productName.toLowerCase().trim();
    if (name.includes("harina") || name.includes("almidon") || name.includes("mandioca") || name.includes("yuca") || name.includes("arroz") || name.includes("maiz") || name.includes("premezcla")) return "Harinas y Mezclas";
    if (name.includes("pan") || name.includes("galleta") || name.includes("cookie") || name.includes("biscotti") || name.includes("cracker") || name.includes("tostada")) return "Panes y Galletas";
    if (name.includes("postre") || name.includes("brownie") || name.includes("marquesa") || name.includes("torta") || name.includes("cake") || name.includes("muffin") || name.includes("pie") || name.includes("cheesecake")) return "Postres y Repostería";
    if (name.includes("snack") || name.includes("fruto") || name.includes("almendra") || name.includes("mani") || name.includes("granola") || name.includes("semilla")) return "Snacks y Frutos Secos";
    if (name.includes("pasta") || name.includes("fideo") || name.includes("cereal")) return "Pastas y Cereales";
    
    // Extract first word capitalized if available
    const words = name.split(/[\s,.\-\/()]+/).filter(Boolean);
    const firstWord = words[0];
    if (firstWord && firstWord.length > 2) {
      return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
    }
    
    return "Otras Líneas";
  };

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Billing Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCedulaPrefix, setCustomerCedulaPrefix] = useState("V");
  const [customerCedulaNumber, setCustomerCedulaNumber] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [checkoutError, setCheckoutError] = useState("");

  // Load cart from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("singlutenpzo_cart") || localStorage.getItem("credishop_guayana_cart");
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch (e) {
        console.error("Error reading cart from localStorage");
      }
    }
  }, []);

  // Save cart to localStorage
  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem("singlutenpzo_cart", JSON.stringify(newCart));
  };

  const handleAddToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      const updated = cart.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      saveCart(updated);
    } else {
      saveCart([...cart, { product, quantity: 1 }]);
    }
    // Give feedback or open cart
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    const updated = cart.map((item) => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as CartItem[];
    saveCart(updated);
  };

  const handleRemoveFromCart = (productId: string) => {
    const updated = cart.filter((item) => item.product.id !== productId);
    saveCart(updated);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError("");

    if (cart.length === 0) {
      setCheckoutError("Tu carrito está vacío.");
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !customerCedulaNumber.trim() || !customerAddress.trim()) {
      setCheckoutError("Por favor completa todos los datos de facturación solicitados.");
      return;
    }

    const combinedCedula = `${customerCedulaPrefix}-${customerCedulaNumber.trim()}`;

    // Build the beautiful structured message for WhatsApp
    const header = `*NUEVO PEDIDO - SINGLUTENPZO* 🌾🍰✨\n\n`;
    
    const clientDetails = `*Datos de Facturación / Despacho:*\n` +
                          `👤 *Cliente:* ${customerName.trim()}\n` +
                          `🪪 *Cédula/RIF:* ${combinedCedula}\n` +
                          `📞 *Teléfono:* ${customerPhone.trim()}\n` +
                          `📧 *Correo:* ${customerEmail.trim() || "N/A"}\n` +
                          `📍 *Dirección:* ${customerAddress.trim()}\n\n`;

    let itemsDetail = `*Productos Solicitados:*\n`;
    cart.forEach((item, index) => {
      itemsDetail += `${index + 1}. *${item.product.name}*\n` +
                     `   Cant: ${item.quantity} x $${item.product.salePrice.toLocaleString()} | Subtotal: *$${(item.product.salePrice * item.quantity).toLocaleString()}*\n`;
    });

    const totalSection = `\n💵 *Total General del Pedido: $${cartTotal.toLocaleString()}*\n\n` +
                         `_Hola, acabo de armar mi pedido desde el catálogo digital de SinGlutenpzo (Oriven Distribuidora de Alimentos). Quedo atento(a) para verificar el pago y proceder con el despacho. ¡Gracias!_`;

    const fullMessage = header + clientDetails + itemsDetail + totalSection;
    const encodedMessage = encodeURIComponent(fullMessage);
    
    // Use the admin configured whatsapp number
    const targetNumber = whatsappNumber ? whatsappNumber.replace(/[^0-9]/g, "") : "584120000000";
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${targetNumber}&text=${encodedMessage}`;

    // Clear cart and localStorage
    saveCart([]);
    setIsCartOpen(false);

    // Open WhatsApp
    window.open(whatsappUrl, "_blank");
  };

  // Get all search-matching productos sin gluten (equipos) products to find active lines
  const activeEquipos = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && p.category === "equipos";
  });

  // Calculate product count per brand/line
  const brandCounts = activeEquipos.reduce((acc, p) => {
    const brand = getProductBrand(p.name);
    acc[brand] = (acc[brand] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const availableBrands = Object.entries(brandCounts)
    .map(([name, count]) => {
      let id = name.toLowerCase();
      if (id === "otras líneas") id = "otros";
      return { id, name, count };
    })
    .sort((a, b) => b.count - a.count);

  if (activeEquipos.length > 0) {
    availableBrands.unshift({
      id: "all",
      name: "Todas las Líneas",
      count: activeEquipos.length
    });
  }

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || p.category === categoryFilter;
    
    if (categoryFilter === "equipos" && selectedBrand !== "all") {
      const brand = getProductBrand(p.name);
      let brandId = brand.toLowerCase();
      if (brandId === "otras líneas") brandId = "otros";
      return matchesSearch && matchesCategory && brandId === selectedBrand;
    }

    return matchesSearch && matchesCategory;
  });

  // Group products by line/brand
  const groupedEquipos: Record<string, Product[]> = {};
  if (categoryFilter === "equipos") {
    filteredProducts.forEach((p) => {
      const brand = getProductBrand(p.name);
      if (!groupedEquipos[brand]) {
        groupedEquipos[brand] = [];
      }
      groupedEquipos[brand].push(p);
    });
  }

  const sortedBrandNames = Object.keys(groupedEquipos).sort((a, b) => {
    if (a === "Otras Líneas") return 1;
    if (b === "Otras Líneas") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-amber-600 hover:bg-amber-500 text-white p-4 rounded-full shadow-2xl flex items-center justify-center space-x-2 transition-all hover:scale-105 border-2 border-white animate-bounce"
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="bg-white text-amber-800 text-xs font-black h-5 w-5 rounded-full flex items-center justify-center shadow-inner">
            {cartItemsCount}
          </span>
        </button>
      )}

      {/* Banner de Bienvenida */}
      <div className="relative rounded-3xl overflow-hidden bg-white/90 backdrop-blur-md text-slate-800 p-6 sm:p-10 shadow-xl border-2 border-amber-300/80">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-15 pointer-events-none"
          style={{ backgroundImage: `url(${bgImg})` }}
        />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-xl space-y-3">
            <span className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-xs font-black uppercase tracking-wider text-emerald-800 shadow-sm">
              <Wheat className="h-3.5 w-3.5 text-emerald-700" />
              <span>SinGlutenpzo • Oriven Distribuidora</span>
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-emerald-950">
              SinGlutenpzo
            </h2>
            <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed">
              Explora nuestro catálogo en tiempo real de productos libres de gluten, harinas alternativas, granos nutritivos y postres saludables hechos con pasión en Puerto Ordaz. ¡Haz tu pedido por WhatsApp con entrega rápida!
            </p>
          </div>
          <div className="flex-shrink-0 self-center md:self-auto">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-white p-3 shadow-xl border-2 border-amber-300 transform hover:scale-105 transition-transform">
              <img
                src={logoImg}
                alt="SinGlutenpzo Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-amber-100">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar harinas, galletas, postres..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-amber-50/50 border border-amber-200/80 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200 rounded-xl text-sm font-medium transition-all outline-none"
          />
        </div>

        <div className="flex space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
              categoryFilter === "all"
                ? "bg-emerald-700 text-white shadow-md shadow-emerald-700/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setCategoryFilter("equipos")}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
              categoryFilter === "equipos"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Wheat className="h-4 w-4" />
            <span>Productos Sin Gluten</span>
          </button>
          <button
            onClick={() => setCategoryFilter("accesorios")}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
              categoryFilter === "accesorios"
                ? "bg-orange-600 text-white shadow-md shadow-orange-600/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Cake className="h-4 w-4" />
            <span>Postres Saludables</span>
          </button>
        </div>
      </div>

      {/* Sub-filtro de Línea / Categoria */}
      {categoryFilter === "equipos" && availableBrands.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50/60 to-emerald-50/40 border border-amber-200/60 p-6 rounded-3xl space-y-4 animate-fade-in shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                <Wheat className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                Selecciona una Línea de Productos
              </span>
            </div>
            {selectedBrand !== "all" && (
              <button
                onClick={() => setSelectedBrand("all")}
                className="text-[10px] font-bold uppercase tracking-wider text-amber-700 hover:text-amber-900 transition-colors"
              >
                Limpiar Filtro ×
              </button>
            )}
          </div>
          
          <div className="flex flex-nowrap sm:flex-wrap gap-3 overflow-x-auto pb-2 sm:pb-0 scrollbar-none scroll-smooth">
            {availableBrands.map((b) => {
              const isSelected = selectedBrand === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBrand(b.id)}
                  className={`flex-shrink-0 flex items-center space-x-3 px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 border focus:outline-none ${
                    isSelected
                      ? "bg-gradient-to-r from-emerald-700 to-amber-600 text-white border-transparent shadow-lg shadow-emerald-700/20 scale-[1.03] -translate-y-0.5"
                      : "bg-white text-slate-700 border-amber-200/80 hover:bg-amber-50/80 hover:border-amber-300 hover:scale-[1.01] hover:-translate-y-0.5 shadow-sm"
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black uppercase transition-all shadow-inner ${
                    isSelected 
                      ? "bg-white/20 text-white" 
                      : "bg-amber-100/60 text-amber-800 border border-amber-200"
                  }`}>
                    {b.id === "all" ? "★" : b.name.charAt(0)}
                  </span>
                  <span className="tracking-tight uppercase font-extrabold">{b.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid de Productos */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
          <Grid className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No se encontraron productos</h3>
          <p className="text-sm text-slate-400 mt-1">Prueba con otra búsqueda o filtro de categoría o marca.</p>
        </div>
      ) : categoryFilter === "equipos" ? (
        <div className="space-y-12">
          {sortedBrandNames.map((brandName) => {
            const brandProducts = groupedEquipos[brandName] || [];
            if (brandProducts.length === 0) return null;
            return (
              <div key={brandName} className="space-y-4 animate-fade-in">
                {/* Brand Header */}
                <div className="flex items-center space-x-2.5 border-b border-amber-200/80 pb-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse" />
                  <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">
                    {brandName}
                  </h3>
                </div>

                {/* Brand Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {brandProducts.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white rounded-3xl overflow-hidden border border-amber-100/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full justify-between"
                    >
                      <div>
                        {/* Product Image */}
                        {product.image ? (
                          <div className="relative aspect-square w-full overflow-hidden bg-amber-50/30 group border-b border-amber-100/80">
                            <img
                              src={product.image}
                              alt={product.name}
                              referrerPolicy="no-referrer"
                              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                            />
                            {product.stock === 0 && (
                              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-2">
                                <span className="flex items-center space-x-1 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold uppercase tracking-widest shadow-md">
                                  <AlertTriangle className="h-3.5 w-3.5 animate-bounce" />
                                  <span>Agotado</span>
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-1 bg-gradient-to-r from-amber-200 to-emerald-200 border-b border-amber-100/50" />
                        )}

                        {/* Product Content */}
                        <div className="p-6 space-y-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200/50 inline-block">
                              Sin Gluten
                            </span>
                            <h3 className="font-bold text-slate-800 text-base leading-snug line-clamp-2">
                              {product.name}
                            </h3>
                          </div>

                          <div className="flex items-end justify-between pt-2">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Precio</span>
                              <span className="text-2xl font-black text-amber-950">${product.salePrice.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Add to Cart button */}
                      <div className="p-6 pt-0 border-t border-amber-50 mt-auto">
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="w-full flex items-center justify-center space-x-2 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md hover:shadow-emerald-700/25 transition-all"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          <span>Añadir al Carrito</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-3xl overflow-hidden border border-amber-100/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full justify-between"
            >
              <div>
                {/* Product Image */}
                {product.image ? (
                  <div className="relative aspect-square w-full overflow-hidden bg-amber-50/30 group border-b border-amber-100/80">
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                    {product.stock === 0 && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-2">
                        <span className="flex items-center space-x-1 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold uppercase tracking-widest shadow-md">
                          <AlertTriangle className="h-3.5 w-3.5 animate-bounce" />
                          <span>Agotado</span>
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-1 bg-gradient-to-r from-amber-200 to-orange-200 border-b border-amber-100/50" />
                )}

                {/* Product Content */}
                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded border border-orange-200/50 inline-block">
                      {product.category === ProductCategory.Equipos ? "Sin Gluten" : "Postre Saludable"}
                    </span>
                    <h3 className="font-bold text-slate-800 text-base leading-snug line-clamp-2">
                      {product.name}
                    </h3>
                  </div>

                  <div className="flex items-end justify-between pt-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Precio</span>
                      <span className="text-2xl font-black text-amber-950">${product.salePrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add to Cart button */}
              <div className="p-6 pt-0 border-t border-amber-50 mt-auto">
                <button
                  onClick={() => handleAddToCart(product)}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md hover:shadow-amber-600/25 transition-all"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>Añadir al Carrito</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SHOPPING CART DRAWER / SLIDING PANEL */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-end">
          <div className="bg-white h-full w-full max-w-lg shadow-2xl flex flex-col border-l border-slate-100 animate-slide-in">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-blue-700">
                <ShoppingCart className="h-6 w-6" />
                <h3 className="text-lg font-black tracking-tight text-slate-900">Carrito de Compras</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-full"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {cart.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <ShoppingBag className="h-16 w-16 text-slate-200 mx-auto animate-bounce" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-700">El carrito está vacío</h4>
                    <p className="text-xs text-slate-400">¡Explora nuestro catálogo y agrega productos para comenzar!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between p-3.5 border border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                        {item.product.image ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="h-12 w-12 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">
                            P
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-extrabold text-slate-800 truncate" title={item.product.name}>
                            {item.product.name}
                          </h4>
                          <span className="text-xs text-slate-400 font-bold block">
                            ${item.product.salePrice.toLocaleString()} unidad
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {/* Quantity selector */}
                        <div className="flex items-center border border-slate-200 bg-white rounded-xl p-1 shadow-sm">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.product.id, -1)}
                            className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2.5 text-xs font-extrabold text-slate-800">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.product.id, 1)}
                            className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Subtotal */}
                        <span className="text-xs font-black text-slate-800 w-16 text-right">
                          ${(item.product.salePrice * item.quantity).toLocaleString()}
                        </span>

                        {/* Remove */}
                        <button
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded-full hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Summary card */}
                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex justify-between items-center">
                    <span className="text-xs font-extrabold text-blue-900 uppercase">Subtotal General:</span>
                    <span className="text-lg font-black text-blue-950">${cartTotal.toLocaleString()}</span>
                  </div>

                  {/* Customer Checkout Form */}
                  <form onSubmit={handleCheckoutSubmit} className="border-t border-slate-100 pt-6 space-y-4">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tus Datos de Facturación / Despacho</p>
                    
                    <div className="space-y-3">
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="Nombre Completo"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-medium transition-all outline-none"
                        />
                      </div>

                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="Número de Teléfono (Celular)"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-medium transition-all outline-none"
                        />
                      </div>

                      <div className="flex gap-2">
                        <select
                          value={customerCedulaPrefix}
                          onChange={(e) => setCustomerCedulaPrefix(e.target.value)}
                          className="p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-bold outline-none"
                        >
                          <option value="V">V</option>
                          <option value="E">E</option>
                          <option value="J">J</option>
                          <option value="G">G</option>
                          <option value="P">P</option>
                        </select>
                        <div className="relative flex-1">
                          <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            required
                            placeholder="Número de Cédula / RIF"
                            value={customerCedulaNumber}
                            onChange={(e) => setCustomerCedulaNumber(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-medium transition-all outline-none"
                          />
                        </div>
                      </div>

                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="Dirección Completa de Despacho"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-medium transition-all outline-none"
                        />
                      </div>

                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          placeholder="Correo Electrónico (para Facturación Automática)"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-medium transition-all outline-none"
                        />
                      </div>
                    </div>

                    {checkoutError && (
                      <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl flex items-center space-x-1.5">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>{checkoutError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center space-x-2 py-3.5 bg-green-600 hover:bg-green-500 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-green-500/25 transition-all"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Confirmar Pedido por WhatsApp</span>
                    </button>
                    <p className="text-[10px] text-center text-slate-400 font-semibold leading-snug">
                      Al presionar se abrirá un chat directo con la administración de la tienda adjuntando la orden detallada con tus datos de facturación para coordinar el pago.
                    </p>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
