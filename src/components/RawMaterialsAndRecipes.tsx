import React, { useState, useMemo } from "react";
import {
  Wheat,
  ChefHat,
  Plus,
  Search,
  Edit2,
  Trash2,
  Sparkles,
  DollarSign,
  PackageCheck,
  AlertTriangle,
  Download,
  Calculator,
  Save,
  Clock,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Scale,
  Zap,
  ShoppingBag,
  Tag,
  Info,
  X
} from "lucide-react";
import * as XLSX from "xlsx";
import { RawMaterial, Recipe, RecipeIngredient, UnitType, Product, ProductCategory } from "../types";

interface RawMaterialsAndRecipesProps {
  rawMaterials: RawMaterial[];
  recipes: Recipe[];
  onAddRawMaterial: (material: Omit<RawMaterial, "id" | "createdAt">) => Promise<void>;
  onEditRawMaterial: (material: RawMaterial) => Promise<void>;
  onDeleteRawMaterial: (id: string) => Promise<void>;
  onAddRecipe: (recipe: Omit<Recipe, "id" | "createdAt">) => Promise<void>;
  onEditRecipe: (recipe: Recipe) => Promise<void>;
  onDeleteRecipe: (id: string) => Promise<void>;
  onPublishRecipeToProduct?: (productData: Omit<Product, "id" | "createdAt">) => Promise<void>;
}

export default function RawMaterialsAndRecipes({
  rawMaterials,
  recipes,
  onAddRawMaterial,
  onEditRawMaterial,
  onDeleteRawMaterial,
  onAddRecipe,
  onEditRecipe,
  onDeleteRecipe,
  onPublishRecipeToProduct
}: RawMaterialsAndRecipesProps) {
  // Main view state: "materia_prima" or "recetas_escandallo"
  const [activeTab, setActiveTab] = useState<"materia_prima" | "recetas_escandallo">("materia_prima");

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modals / Forms states
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);

  // Raw Material Form Data
  const [matName, setMatName] = useState("");
  const [matUnit, setMatUnit] = useState<UnitType>("kg");
  const [matStock, setMatStock] = useState<number | "">("");
  const [matMinStock, setMatMinStock] = useState<number | "">("");
  const [matCostPerUnit, setMatCostPerUnit] = useState<number | "">("");
  const [matSupplier, setMatSupplier] = useState("");
  const [matNotes, setMatNotes] = useState("");
  const [isSavingMat, setIsSavingMat] = useState(false);

  // Recipe Builder & Editor States
  const [isRecipeBuilderOpen, setIsRecipeBuilderOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const [recName, setRecName] = useState("");
  const [recYieldQty, setRecYieldQty] = useState<number | "">(10);
  const [recYieldUnit, setRecYieldUnit] = useState("porciones");
  const [recPrepMinutes, setRecPrepMinutes] = useState<number | "">(45);
  const [recCategory, setRecCategory] = useState("Panadería");
  const [recDescription, setRecDescription] = useState("");

  // Ingredients for the current recipe being created/edited
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);

  // Current Ingredient Input row state
  const [selectedMatId, setSelectedMatId] = useState("");
  const [ingName, setIngName] = useState("");
  const [ingQty, setIngQty] = useState<number | "">("");
  const [ingUnit, setIngUnit] = useState<UnitType>("gr");
  const [ingCostPerSupplierUnit, setIngCostPerSupplierUnit] = useState<number | "">("");
  const [ingSupplierUnit, setIngSupplierUnit] = useState<UnitType>("kg");

  // Extras & Overhead
  const [recPackagingCost, setRecPackagingCost] = useState<number | "">(1.50);
  const [recLaborCost, setRecLaborCost] = useState<number | "">(3.00);
  const [recOverheadPercentage, setRecOverheadPercentage] = useState<number | "">(15);
  const [recDesiredMargin, setRecDesiredMargin] = useState<number | "">(60);

  // AI Costing Results & Loading State
  const [aiAnalysisResult, setAiAnalysisResult] = useState<Recipe["aiAnalysis"] | null>(null);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);

  // Publish to Catalog Modal State
  const [publishingRecipe, setPublishingRecipe] = useState<Recipe | null>(null);
  const [publishSalePrice, setPublishSalePrice] = useState<number>(0);
  const [publishWholesalePrice, setPublishWholesalePrice] = useState<number>(0);
  const [publishCategory, setPublishCategory] = useState<ProductCategory>(ProductCategory.Equipos);
  const [publishStock, setPublishStock] = useState<number>(10);
  const [isPublishing, setIsPublishing] = useState(false);

  // Reset Raw Material Modal Form
  const openNewMaterialModal = () => {
    setEditingMaterial(null);
    setMatName("");
    setMatUnit("kg");
    setMatStock("");
    setMatMinStock(2);
    setMatCostPerUnit("");
    setMatSupplier("");
    setMatNotes("");
    setIsMaterialModalOpen(true);
  };

  const openEditMaterialModal = (mat: RawMaterial) => {
    setEditingMaterial(mat);
    setMatName(mat.name);
    setMatUnit(mat.unit);
    setMatStock(mat.stock);
    setMatMinStock(mat.minStock !== undefined ? mat.minStock : 2);
    setMatCostPerUnit(mat.costPerUnit);
    setMatSupplier(mat.supplier || "");
    setMatNotes(mat.notes || "");
    setIsMaterialModalOpen(true);
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matName.trim() || matStock === "" || matCostPerUnit === "") return;

    setIsSavingMat(true);
    try {
      const stockNum = Number(matStock);
      const costNum = Number(matCostPerUnit);
      const minStockNum = matMinStock !== "" ? Number(matMinStock) : 0;
      const totalCostNum = stockNum * costNum;

      if (editingMaterial) {
        await onEditRawMaterial({
          ...editingMaterial,
          name: matName.trim(),
          unit: matUnit,
          stock: stockNum,
          minStock: minStockNum,
          costPerUnit: costNum,
          totalCost: totalCostNum,
          supplier: matSupplier.trim(),
          notes: matNotes.trim(),
          updatedAt: new Date().toISOString()
        });
      } else {
        await onAddRawMaterial({
          name: matName.trim(),
          unit: matUnit,
          stock: stockNum,
          minStock: minStockNum,
          costPerUnit: costNum,
          totalCost: totalCostNum,
          supplier: matSupplier.trim(),
          notes: matNotes.trim()
        });
      }
      setIsMaterialModalOpen(false);
    } catch (err) {
      console.error("Error al guardar materia prima:", err);
      alert("Error al guardar materia prima.");
    } finally {
      setIsSavingMat(false);
    }
  };

  // Convert quantity based on unit to calculate ingredient cost
  const calculateIngredientCost = (
    qty: number,
    recUnit: UnitType,
    supplierCost: number,
    suppUnit: UnitType
  ): number => {
    if (qty <= 0 || supplierCost <= 0) return 0;

    let qtyInSupplierUnit = qty;

    // Mass conversion
    if (recUnit === "gr" && suppUnit === "kg") {
      qtyInSupplierUnit = qty / 1000;
    } else if (recUnit === "kg" && suppUnit === "gr") {
      qtyInSupplierUnit = qty * 1000;
    }
    // Volume conversion
    else if (recUnit === "ml" && suppUnit === "lt") {
      qtyInSupplierUnit = qty / 1000;
    } else if (recUnit === "lt" && suppUnit === "ml") {
      qtyInSupplierUnit = qty * 1000;
    }
    // Unit conversion
    else if (recUnit === "unidad" && suppUnit === "docena") {
      qtyInSupplierUnit = qty / 12;
    } else if (recUnit === "docena" && suppUnit === "unidad") {
      qtyInSupplierUnit = qty * 12;
    }

    return Number((qtyInSupplierUnit * supplierCost).toFixed(4));
  };

  // When a raw material is picked in the recipe builder, auto-fill supplier price & units
  const handleSelectRawMaterial = (matId: string) => {
    setSelectedMatId(matId);
    if (!matId) return;

    const found = rawMaterials.find((m) => m.id === matId);
    if (found) {
      setIngName(found.name);
      setIngCostPerSupplierUnit(found.costPerUnit);
      setIngSupplierUnit(found.unit);
      setIngUnit(found.unit === "kg" ? "gr" : found.unit === "lt" ? "ml" : found.unit);
    }
  };

  // Add ingredient row to current recipe draft
  const handleAddIngredient = () => {
    if (!ingName.trim() || !ingQty || !ingCostPerSupplierUnit) {
      alert("Por favor ingrese el nombre del ingrediente, la cantidad y el costo del proveedor.");
      return;
    }

    const qtyNum = Number(ingQty);
    const costNum = Number(ingCostPerSupplierUnit);
    const calcCost = calculateIngredientCost(qtyNum, ingUnit, costNum, ingSupplierUnit);

    const newIng: RecipeIngredient = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      rawMaterialId: selectedMatId || undefined,
      name: ingName.trim(),
      quantity: qtyNum,
      unit: ingUnit,
      costPerSupplierUnit: costNum,
      supplierUnit: ingSupplierUnit,
      calculatedCost: calcCost
    };

    setRecipeIngredients([...recipeIngredients, newIng]);

    // Clear ingredient input row
    setSelectedMatId("");
    setIngName("");
    setIngQty("");
    setIngCostPerSupplierUnit("");
  };

  const handleRemoveIngredient = (id: string) => {
    setRecipeIngredients(recipeIngredients.filter((ing) => ing.id !== id));
  };

  // Calculated Totals for Recipe Draft
  const totalIngredientsCost = useMemo(() => {
    return recipeIngredients.reduce((sum, item) => sum + (item.calculatedCost || 0), 0);
  }, [recipeIngredients]);

  const packagingCostNum = typeof recPackagingCost === "number" ? recPackagingCost : 0;
  const laborCostNum = typeof recLaborCost === "number" ? recLaborCost : 0;
  const overheadPctNum = typeof recOverheadPercentage === "number" ? recOverheadPercentage : 0;

  const overheadAmount = useMemo(() => {
    return Number(((totalIngredientsCost * overheadPctNum) / 100).toFixed(2));
  }, [totalIngredientsCost, overheadPctNum]);

  const totalRecipeBatchCost = useMemo(() => {
    return Number((totalIngredientsCost + packagingCostNum + laborCostNum + overheadAmount).toFixed(2));
  }, [totalIngredientsCost, packagingCostNum, laborCostNum, overheadAmount]);

  const yieldQtyNum = typeof recYieldQty === "number" && recYieldQty > 0 ? recYieldQty : 1;

  const costPerUnit = useMemo(() => {
    return Number((totalRecipeBatchCost / yieldQtyNum).toFixed(2));
  }, [totalRecipeBatchCost, yieldQtyNum]);

  const desiredMarginNum = typeof recDesiredMargin === "number" ? recDesiredMargin : 50;

  const suggestedSalePricePerUnit = useMemo(() => {
    if (costPerUnit <= 0) return 0;
    // Formula for Price based on Gross Margin % = Cost / (1 - Margin%)
    const marginDecimal = Math.min(desiredMarginNum, 95) / 100;
    const price = costPerUnit / (1 - marginDecimal);
    return Number(price.toFixed(2));
  }, [costPerUnit, desiredMarginNum]);

  const suggestedBatchSalePrice = useMemo(() => {
    return Number((suggestedSalePricePerUnit * yieldQtyNum).toFixed(2));
  }, [suggestedSalePricePerUnit, yieldQtyNum]);

  // Open Recipe Builder
  const openNewRecipeBuilder = () => {
    setEditingRecipe(null);
    setRecName("");
    setRecYieldQty(10);
    setRecYieldUnit("porciones");
    setRecPrepMinutes(45);
    setRecCategory("Panadería");
    setRecDescription("");
    setRecipeIngredients([]);
    setRecPackagingCost(1.50);
    setRecLaborCost(3.00);
    setRecOverheadPercentage(15);
    setRecDesiredMargin(60);
    setAiAnalysisResult(null);
    setAiError(null);
    setIsRecipeBuilderOpen(true);
  };

  const openEditRecipeBuilder = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setRecName(recipe.name);
    setRecYieldQty(recipe.yieldQuantity);
    setRecYieldUnit(recipe.yieldUnit);
    setRecPrepMinutes(recipe.preparationTimeMinutes || 45);
    setRecCategory(recipe.category || "Panadería");
    setRecDescription(recipe.description || "");
    setRecipeIngredients(recipe.ingredients || []);
    setRecPackagingCost(recipe.packagingCost !== undefined ? recipe.packagingCost : 1.50);
    setRecLaborCost(recipe.laborCost !== undefined ? recipe.laborCost : 3.00);
    setRecOverheadPercentage(recipe.overheadPercentage !== undefined ? recipe.overheadPercentage : 15);
    setRecDesiredMargin(recipe.desiredMarginPercentage !== undefined ? recipe.desiredMarginPercentage : 60);
    setAiAnalysisResult(recipe.aiAnalysis || null);
    setAiError(null);
    setIsRecipeBuilderOpen(true);
  };

  // Call Gemini AI Endpoint `/api/recipe-costing-ai`
  const handleAnalyzeWithAI = async () => {
    if (!recName.trim()) {
      alert("Por favor ingrese el nombre de la receta antes de calcular con la IA.");
      return;
    }
    if (recipeIngredients.length === 0) {
      alert("Agregue al menos un ingrediente a la receta.");
      return;
    }

    setIsAnalyzingAI(true);
    setAiError(null);

    try {
      const response = await fetch("/api/recipe-costing-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeName: recName.trim(),
          yieldQuantity: yieldQtyNum,
          yieldUnit: recYieldUnit,
          preparationTimeMinutes: typeof recPrepMinutes === "number" ? recPrepMinutes : 30,
          category: recCategory,
          ingredients: recipeIngredients,
          packagingCost: packagingCostNum,
          laborCost: laborCostNum,
          overheadPercentage: overheadPctNum,
          desiredMarginPercentage: desiredMarginNum,
          rawMaterialsContext: rawMaterials.map((m) => ({
            name: m.name,
            stock: m.stock,
            unit: m.unit,
            costPerUnit: m.costPerUnit,
            supplier: m.supplier
          }))
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error al comunicarse con el servidor de IA.");
      }

      setAiAnalysisResult({
        summary: data.summary || "Escandallo procesado exitosamente.",
        profitabilityScore: data.profitabilityScore || 85,
        marketRecommendation: data.marketRecommendation || "Precio competitivo recomendado para pastelería sin gluten.",
        costReductionTips: data.costReductionTips || [],
        pricingTiers: data.pricingTiers || {
          retail: suggestedSalePricePerUnit,
          wholesale: Number((suggestedSalePricePerUnit * 0.82).toFixed(2)),
          credit: Number((suggestedSalePricePerUnit * 1.15).toFixed(2))
        },
        rawMaterialUsageSummary: data.rawMaterialUsageSummary || ""
      });
    } catch (err: any) {
      console.error("Error en análisis IA:", err);
      setAiError(err.message || "No se pudo obtener el análisis de IA. Intente nuevamente.");
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // Save Recipe to Firestore
  const handleSaveRecipe = async () => {
    if (!recName.trim()) {
      alert("Por favor ingrese el nombre de la receta.");
      return;
    }
    if (recipeIngredients.length === 0) {
      alert("Agregue al menos un ingrediente a la receta.");
      return;
    }

    setIsSavingRecipe(true);
    try {
      const newRecipeData = {
        name: recName.trim(),
        yieldQuantity: yieldQtyNum,
        yieldUnit: recYieldUnit.trim() || "porciones",
        preparationTimeMinutes: typeof recPrepMinutes === "number" ? recPrepMinutes : 30,
        category: recCategory,
        description: recDescription.trim(),
        ingredients: recipeIngredients,
        totalIngredientsCost,
        packagingCost: packagingCostNum,
        laborCost: laborCostNum,
        overheadPercentage: overheadPctNum,
        overheadCost: overheadAmount,
        totalRecipeCost: totalRecipeBatchCost,
        costPerUnit,
        desiredMarginPercentage: desiredMarginNum,
        suggestedSalePricePerUnit,
        suggestedBatchSalePrice,
        aiAnalysis: aiAnalysisResult || undefined,
        updatedAt: new Date().toISOString()
      };

      if (editingRecipe) {
        await onEditRecipe({
          ...editingRecipe,
          ...newRecipeData
        });
      } else {
        await onAddRecipe(newRecipeData);
      }

      setIsRecipeBuilderOpen(false);
    } catch (err) {
      console.error("Error al guardar la receta:", err);
      alert("Ocurrió un error al guardar la receta.");
    } finally {
      setIsSavingRecipe(false);
    }
  };

  // Export Raw Materials to Excel
  const handleExportRawMaterials = () => {
    const dataToExport = rawMaterials.map((m) => ({
      "Nombre de Materia Prima": m.name,
      "Unidad de Medida": m.unit.toUpperCase(),
      "Cantidad en Almacén": m.stock,
      "Alerta Stock Mínimo": m.minStock || 0,
      "Costo por Unidad ($)": m.costPerUnit,
      "Valor Total Almacenado ($)": Number((m.stock * m.costPerUnit).toFixed(2)),
      "Proveedor Principal": m.supplier || "N/A",
      "Notas": m.notes || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Materia Prima");

    const maxLens = Object.keys(dataToExport[0] || {}).map((key) => ({
      wch: Math.max(key.length + 5, 18)
    }));
    worksheet["!cols"] = maxLens;

    XLSX.writeFile(workbook, "Inventario_Materia_Prima_SinGlutenpzo.xlsx");
  };

  // Filtered raw materials
  const filteredMaterials = useMemo(() => {
    return rawMaterials.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.supplier && m.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSearch;
    });
  }, [rawMaterials, searchTerm]);

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const matchSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = categoryFilter === "all" || r.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [recipes, searchTerm, categoryFilter]);

  // Raw Materials Stats
  const rawMatStats = useMemo(() => {
    const totalItems = rawMaterials.length;
    const totalValuation = rawMaterials.reduce((sum, m) => sum + m.stock * m.costPerUnit, 0);
    const lowStockCount = rawMaterials.filter((m) => m.stock <= (m.minStock || 0)).length;
    return { totalItems, totalValuation, lowStockCount };
  }, [rawMaterials]);

  // Open Publish Modal
  const openPublishModal = (recipe: Recipe) => {
    setPublishingRecipe(recipe);
    setPublishSalePrice(recipe.suggestedSalePricePerUnit);
    setPublishWholesalePrice(recipe.aiAnalysis?.pricingTiers?.wholesale || Number((recipe.suggestedSalePricePerUnit * 0.85).toFixed(2)));
    setPublishCategory(ProductCategory.Equipos);
    setPublishStock(10);
  };

  const handleConfirmPublish = async () => {
    if (!publishingRecipe || !onPublishRecipeToProduct) return;
    setIsPublishing(true);
    try {
      await onPublishRecipeToProduct({
        name: publishingRecipe.name,
        category: publishCategory,
        costPrice: publishingRecipe.costPerUnit,
        salePrice: publishSalePrice,
        wholesalePrice: publishWholesalePrice,
        creditPrice: Number((publishSalePrice * 1.15).toFixed(2)),
        stock: publishStock,
        image: "",
        referenceProfit: publishSalePrice - publishingRecipe.costPerUnit
      });
      alert(`¡Producto "${publishingRecipe.name}" publicado exitosamente en el inventario del catálogo!`);
      setPublishingRecipe(null);
    } catch (err) {
      console.error("Error al publicar receta en catálogo:", err);
      alert("Error al publicar receta.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Main Banner & Tab Switcher */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-amber-950 text-white p-6 rounded-2xl shadow-xl border border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30">
              <Wheat className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-100 to-emerald-300">
                Insumos & Escandallo de Recetas IA
              </h2>
              <p className="text-xs text-emerald-300/80 font-medium">
                Gestión privada de materias primas, costos reales y cálculo inteligente de precios de venta con Gemini IA
              </p>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/10 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("materia_prima")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === "materia_prima"
                ? "bg-amber-500 text-slate-950 shadow-lg font-black"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <Wheat className="h-4 w-4" />
            <span>Materia Prima ({rawMaterials.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("recetas_escandallo")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === "recetas_escandallo"
                ? "bg-emerald-500 text-slate-950 shadow-lg font-black"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <ChefHat className="h-4 w-4" />
            <span>Recetas & Escandallo IA ({recipes.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MATERIA PRIMA (RAW MATERIALS) */}
      {activeTab === "materia_prima" && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-md flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Insumos Registrados</p>
                <h3 className="text-2xl font-black text-white mt-1">{rawMatStats.totalItems} <span className="text-xs font-normal text-slate-400">ítems</span></h3>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                <PackageCheck className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-md flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor Invertido en Stock</p>
                <h3 className="text-2xl font-black text-emerald-400 mt-1">${rawMatStats.totalValuation.toLocaleString("en-US", { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-md flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alerta de Stock Bajo</p>
                <h3 className={`text-2xl font-black mt-1 ${rawMatStats.lowStockCount > 0 ? "text-amber-400" : "text-slate-300"}`}>
                  {rawMatStats.lowStockCount} <span className="text-xs font-normal text-slate-400">insumos por reponer</span>
                </h3>
              </div>
              <div className={`p-3 rounded-xl border ${rawMatStats.lowStockCount > 0 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-slate-800 text-slate-400 border-slate-700"}`}>
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Action Bar & Controls */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar materia prima o proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
              <button
                onClick={handleExportRawMaterials}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2"
              >
                <Download className="h-4 w-4 text-emerald-400" />
                <span>Exportar Excel</span>
              </button>

              <button
                onClick={openNewMaterialModal}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Nueva Materia Prima</span>
              </button>
            </div>
          </div>

          {/* Raw Materials Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3 px-4">Materia Prima</th>
                    <th className="py-3 px-4">Stock Almacenado</th>
                    <th className="py-3 px-4">Costo x Unidad</th>
                    <th className="py-3 px-4">Valor en Almacén</th>
                    <th className="py-3 px-4">Proveedor</th>
                    <th className="py-3 px-4">Estado Stock</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500">
                        <Wheat className="h-10 w-10 mx-auto mb-2 opacity-30 text-amber-400" />
                        <p className="text-base font-semibold">No se encontraron materias primas.</p>
                        <p className="text-xs text-slate-600 mt-1">Haga clic en "+ Nueva Materia Prima" para registrar harinas, féculas, azúcar o empaques.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredMaterials.map((mat) => {
                      const isLowStock = mat.stock <= (mat.minStock || 0);
                      const valuation = mat.stock * mat.costPerUnit;

                      return (
                        <tr key={mat.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{mat.name}</div>
                            {mat.notes && <div className="text-[11px] text-slate-400 truncate max-w-xs">{mat.notes}</div>}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-100">
                            {mat.stock} <span className="text-xs text-amber-400/90 font-bold">{mat.unit}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-emerald-400">
                            ${mat.costPerUnit.toFixed(2)} <span className="text-[10px] text-slate-400">/{mat.unit}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-white">
                            ${valuation.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-300">
                            {mat.supplier || <span className="text-slate-600 font-italic">Sin especificar</span>}
                          </td>
                          <td className="py-3 px-4">
                            {isLowStock ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Stock Bajo (Min: {mat.minStock})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Óptimo</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => openEditMaterialModal(mat)}
                              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
                              title="Editar materia prima"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`¿Desea eliminar la materia prima "${mat.name}"?`)) {
                                  onDeleteRawMaterial(mat.id);
                                }
                              }}
                              className="p-1.5 hover:bg-rose-950 text-rose-400 hover:text-rose-200 rounded-lg transition-colors"
                              title="Eliminar materia prima"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECETAS & ESCANDALLO IA */}
      {activeTab === "recetas_escandallo" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar receta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Todas las categorías</option>
                <option value="Panadería">Panadería</option>
                <option value="Postres">Postres</option>
                <option value="Galletas">Galletas</option>
                <option value="Masas & Harinas">Masas & Harinas</option>
                <option value="Bebidas">Bebidas</option>
              </select>
            </div>

            <button
              onClick={openNewRecipeBuilder}
              className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 hover:from-emerald-600 hover:to-amber-600 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all flex items-center justify-center space-x-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>➕ Crear Nueva Receta / Escandallo IA</span>
            </button>
          </div>

          {/* Saved Recipes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.length === 0 ? (
              <div className="col-span-full bg-slate-900/90 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                <ChefHat className="h-12 w-12 mx-auto mb-3 opacity-30 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">No hay recetas guardadas</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Comience creando su primera receta o escandallo. Podrá agregar ingredientes de su inventario de materia prima, calcular gastos fijos y dejar que la IA Gemini le proporcione la estrategia de precios idónea.
                </p>
                <button
                  onClick={openNewRecipeBuilder}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase transition-all inline-flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Crear Primera Receta</span>
                </button>
              </div>
            ) : (
              filteredRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all group"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider mb-1">
                          {recipe.category || "General"}
                        </span>
                        <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                          {recipe.name}
                        </h3>
                      </div>
                      {recipe.aiAnalysis && (
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Puntaje IA</span>
                          <span className="text-xs font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30">
                            {recipe.aiAnalysis.profitabilityScore}/100
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Yield and Prep Time */}
                    <div className="flex items-center space-x-4 text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800">
                      <div className="flex items-center space-x-1">
                        <Scale className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Rinde: <strong>{recipe.yieldQuantity} {recipe.yieldUnit}</strong></span>
                      </div>
                      {recipe.preparationTimeMinutes && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3.5 w-3.5 text-amber-400" />
                          <span>{recipe.preparationTimeMinutes} mins</span>
                        </div>
                      )}
                    </div>

                    {/* Ingredients summary tag */}
                    <div className="mt-3 text-xs text-slate-400">
                      <strong>Ingredientes ({recipe.ingredients.length}):</strong>{" "}
                      <span className="text-slate-300">
                        {recipe.ingredients.slice(0, 3).map((i) => i.name).join(", ")}
                        {recipe.ingredients.length > 3 ? "..." : ""}
                      </span>
                    </div>

                    {/* Financial Summary Box */}
                    <div className="mt-4 p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Costo Total Lote:</span>
                        <span className="font-mono text-slate-200">${recipe.totalRecipeCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Costo por Porción:</span>
                        <span className="font-mono font-bold text-amber-300">${recipe.costPerUnit.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-800">
                        <span className="text-emerald-400">Precio Sugerido (Porción):</span>
                        <span className="font-mono text-emerald-400 text-sm">${recipe.suggestedSalePricePerUnit.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* AI Recommendation snippet */}
                    {recipe.aiAnalysis?.summary && (
                      <p className="text-[11px] text-slate-400 mt-3 line-clamp-2 italic bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                        "{recipe.aiAnalysis.summary}"
                      </p>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => openPublishModal(recipe)}
                      className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 rounded-lg text-xs font-bold transition-all flex items-center space-x-1"
                      title="Publicar esta receta como producto a la venta en el catálogo"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>Publicar en Tienda</span>
                    </button>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditRecipeBuilder(recipe)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                        title="Editar receta / recalcular escandallo"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Desea eliminar la receta "${recipe.name}"?`)) {
                            onDeleteRecipe(recipe.id);
                          }
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-rose-950 text-rose-400 hover:text-rose-200 rounded-lg transition-colors"
                        title="Eliminar receta"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT RAW MATERIAL */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-4 sm:p-6 relative my-auto max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsMaterialModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <Wheat className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {editingMaterial ? "Editar Materia Prima" : "Registrar Materia Prima"}
                </h3>
                <p className="text-xs text-slate-400">Guarde insumos con su costo real por unidad de medida</p>
              </div>
            </div>

            <form onSubmit={handleSaveMaterial} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Nombre de la Materia Prima *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Harina de Arroz Sin Gluten, Almidón de Yuca, Cajas 20x20..."
                  value={matName}
                  onChange={(e) => setMatName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Unidad de Medida *</label>
                  <select
                    value={matUnit}
                    onChange={(e) => setMatUnit(e.target.value as UnitType)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="gr">Gramos (gr)</option>
                    <option value="lt">Litros (lt)</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="unidad">Unidades (ud)</option>
                    <option value="docena">Docenas</option>
                    <option value="paquete">Paquetes</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Cantidad Almacenada *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Ej: 25"
                    value={matStock}
                    onChange={(e) => setMatStock(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Costo real x {matUnit.toUpperCase()} ($) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Ej: 3.50"
                    value={matCostPerUnit}
                    onChange={(e) => setMatCostPerUnit(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Alerta Stock Mínimo</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Ej: 2"
                    value={matMinStock}
                    onChange={(e) => setMatMinStock(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Proveedor Principal</label>
                <input
                  type="text"
                  placeholder="Ej: Distribuidora BioPan, Oriven Alimentos..."
                  value={matSupplier}
                  onChange={(e) => setMatSupplier(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Notas Adicionales</label>
                <textarea
                  rows={2}
                  placeholder="Detalles de conservación, lote o rendimiento..."
                  value={matNotes}
                  onChange={(e) => setMatNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMaterialModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingMat}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 rounded-xl text-xs font-black uppercase shadow-lg transition-all"
                >
                  {isSavingMat ? "Guardando..." : "Guardar Materia Prima"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECIPE BUILDER & AI COSTING CALCULATOR */}
      {isRecipeBuilderOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl p-4 sm:p-6 my-auto relative max-h-[92vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            <button
              onClick={() => setIsRecipeBuilderOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-800">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <ChefHat className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">
                  {editingRecipe ? "Editar Receta y Escandallo IA" : "Crear Receta y Escandallo Digital IA"}
                </h3>
                <p className="text-xs text-slate-400">
                  Defina los ingredientes, empaque y gastos fijos para calcular los costos exactos y obtener recomendaciones de precios de Gemini IA
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* SECTION A: Basic Recipe Info */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Tag className="h-4 w-4" />
                  <span>1. Datos de la Receta / Postre</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1">Nombre de la Receta *</label>
                    <input
                      type="text"
                      placeholder="Ej: Pan de Molde Multigrano Sin Gluten, Torta de Chocolate 8p, Galletas Almendra x12"
                      value={recName}
                      onChange={(e) => setRecName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Rendimiento (Porciones/Unidades) *</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ej: 10"
                      value={recYieldQty}
                      onChange={(e) => setRecYieldQty(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Unidad de Rendimiento</label>
                    <input
                      type="text"
                      placeholder="Ej: porciones, unidades, galletas, tortas"
                      value={recYieldUnit}
                      onChange={(e) => setRecYieldUnit(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Categoría</label>
                    <select
                      value={recCategory}
                      onChange={(e) => setRecCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Panadería">Panadería</option>
                      <option value="Postres">Postres</option>
                      <option value="Galletas">Galletas</option>
                      <option value="Masas & Harinas">Masas & Harinas</option>
                      <option value="Bebidas">Bebidas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Tiempo de Preparación (Minutos)</label>
                    <input
                      type="number"
                      placeholder="Ej: 45"
                      value={recPrepMinutes}
                      onChange={(e) => setRecPrepMinutes(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Descripción corta / Notas</label>
                    <input
                      type="text"
                      placeholder="Ej: Receta libre de gluten con harinas alternativas"
                      value={recDescription}
                      onChange={(e) => setRecDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION B: Ingredients Table & Quick Add from Stock */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Wheat className="h-4 w-4" />
                  <span>2. Insumos e Ingredientes Requeridos</span>
                </h4>

                {/* Add Ingredient Row */}
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-300">
                    💡 Seleccionar de Materia Prima en Almacén (opcional) o ingresar manualmente:
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Materia Prima en Stock</label>
                      <select
                        value={selectedMatId}
                        onChange={(e) => handleSelectRawMaterial(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="">-- Seleccionar de Stock --</option>
                        {rawMaterials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} (${m.costPerUnit}/{m.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre Ingrediente *</label>
                      <input
                        type="text"
                        placeholder="Ej: Harina de Arroz"
                        value={ingName}
                        onChange={(e) => setIngName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cantidad Receta *</label>
                      <div className="flex space-x-1">
                        <input
                          type="number"
                          step="any"
                          placeholder="350"
                          value={ingQty}
                          onChange={(e) => setIngQty(e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                        />
                        <select
                          value={ingUnit}
                          onChange={(e) => setIngUnit(e.target.value as UnitType)}
                          className="px-1.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-amber-300 font-bold focus:outline-none"
                        >
                          <option value="gr">gr</option>
                          <option value="kg">kg</option>
                          <option value="ml">ml</option>
                          <option value="lt">lt</option>
                          <option value="unidad">ud</option>
                        </select>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Costo Proveedor ($) *</label>
                      <div className="flex space-x-1">
                        <input
                          type="number"
                          step="any"
                          placeholder="4.00"
                          value={ingCostPerSupplierUnit}
                          onChange={(e) => setIngCostPerSupplierUnit(e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                        />
                        <span className="text-[10px] text-slate-400 self-center">/{ingSupplierUnit}</span>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={handleAddIngredient}
                        className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Agregar</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Ingredients List Table */}
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                        <th className="py-2.5 px-3">Ingrediente</th>
                        <th className="py-2.5 px-3">Cantidad Receta</th>
                        <th className="py-2.5 px-3">Precio Proveedor</th>
                        <th className="py-2.5 px-3">Costo Calculado</th>
                        <th className="py-2.5 px-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {recipeIngredients.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-6 text-slate-500">
                            Aún no se han agregado ingredientes a esta receta.
                          </td>
                        </tr>
                      ) : (
                        recipeIngredients.map((ing) => (
                          <tr key={ing.id} className="hover:bg-slate-900/50">
                            <td className="py-2.5 px-3 font-semibold text-white">{ing.name}</td>
                            <td className="py-2.5 px-3 font-mono">
                              {ing.quantity} <span className="text-amber-400 font-bold">{ing.unit}</span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">
                              ${ing.costPerSupplierUnit.toFixed(2)} /{ing.supplierUnit}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                              ${ing.calculatedCost.toFixed(3)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveIngredient(ing.id)}
                                className="text-rose-400 hover:text-rose-200 p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {recipeIngredients.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-900/90 font-bold text-white border-t border-slate-800">
                          <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-[10px] text-slate-400">
                            Subtotal Insumos de Receta:
                          </td>
                          <td className="py-2.5 px-3 font-mono text-emerald-300 text-sm">
                            ${totalIngredientsCost.toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* SECTION C: Fixed Expenses, Labor & Overhead */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Zap className="h-4 w-4" />
                  <span>3. Empaque, Mano de Obra y Gastos Fijos (Luz, Agua, Gas, Alquiler)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Costo Empaque/Cajas/Etiquetas ($)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ej: 1.50"
                      value={recPackagingCost}
                      onChange={(e) => setRecPackagingCost(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Mano de Obra Directa ($)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ej: 3.00"
                      value={recLaborCost}
                      onChange={(e) => setRecLaborCost(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">% Gastos Fijos (Luz, Agua, Gas)</label>
                    <div className="flex space-x-2 items-center">
                      <input
                        type="number"
                        step="any"
                        placeholder="15"
                        value={recOverheadPercentage}
                        onChange={(e) => setRecOverheadPercentage(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <span className="text-xs font-bold text-slate-400">%</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Calculado sobre costo insumos (${overheadAmount.toFixed(2)})</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Margen Deseado de Ganancia (%)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="60"
                      value={recDesiredMargin}
                      onChange={(e) => setRecDesiredMargin(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION D: Live Escandallo Costing Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Insumos + Empaque + Mano Obra</p>
                  <p className="text-lg font-black font-mono text-white mt-1">
                    ${(totalIngredientsCost + packagingCostNum + laborCostNum).toFixed(2)}
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Gastos Fijos ({overheadPctNum}%)</p>
                  <p className="text-lg font-black font-mono text-blue-300 mt-1">
                    ${overheadAmount.toFixed(2)}
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <p className="text-[10px] font-bold uppercase text-amber-400">Costo Completo Receta</p>
                  <p className="text-lg font-black font-mono text-amber-300 mt-1">
                    ${totalRecipeBatchCost.toFixed(2)}
                  </p>
                </div>

                <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/40 text-center">
                  <p className="text-[10px] font-bold uppercase text-emerald-400">Costo por Porción ({recYieldUnit})</p>
                  <p className="text-xl font-black font-mono text-emerald-300 mt-0.5">
                    ${costPerUnit.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* SECTION E: AI Escandallo Analysis Button & Results */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/60 p-5 rounded-2xl border border-emerald-800/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-black text-white flex items-center space-x-2">
                      <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
                      <span>Análisis de Escandallo y Precios Sugeridos con Gemini IA</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Obtenga precios sugeridos al detal, mayor y crédito con recomendaciones de rentabilidad para el mercado venezolano.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAnalyzeWithAI}
                    disabled={isAnalyzingAI}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isAnalyzingAI ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Analizando con IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>🤖 Calcular Escandallo con IA</span>
                      </>
                    )}
                  </button>
                </div>

                {aiError && (
                  <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-200">
                    {aiError}
                  </div>
                )}

                {/* AI Results Display */}
                {aiAnalysisResult && (
                  <div className="mt-4 p-4 bg-slate-950/90 rounded-xl border border-emerald-500/40 space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Diagnóstico IA de Rentabilidad</span>
                        <div className="text-lg font-black text-emerald-300">
                          Puntuación: {aiAnalysisResult.profitabilityScore} / 100
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Precio Sugerido al Detal</span>
                        <div className="text-2xl font-black text-amber-300 font-mono">
                          ${suggestedSalePricePerUnit.toFixed(2)} <span className="text-xs font-normal text-slate-400">/{recYieldUnit}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pricing Tiers */}
                    {aiAnalysisResult.pricingTiers && (
                      <div className="grid grid-cols-3 gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Precio al Mayor</p>
                          <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                            ${aiAnalysisResult.pricingTiers.wholesale.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Precio al Detal</p>
                          <p className="text-sm font-bold font-mono text-amber-300 mt-0.5">
                            ${aiAnalysisResult.pricingTiers.retail.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Precio a Crédito</p>
                          <p className="text-sm font-bold font-mono text-blue-300 mt-0.5">
                            ${aiAnalysisResult.pricingTiers.credit.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Executive Summary */}
                    <div>
                      <h5 className="text-xs font-bold text-slate-200 uppercase mb-1">Estrategia y Análisis de IA:</h5>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        {aiAnalysisResult.summary}
                      </p>
                    </div>

                    {/* Tips */}
                    {aiAnalysisResult.costReductionTips && aiAnalysisResult.costReductionTips.length > 0 && (
                      <div>
                        <h5 className="text-xs font-bold text-amber-400 uppercase mb-1">Sugerencias de Optimización de Costos:</h5>
                        <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                          {aiAnalysisResult.costReductionTips.map((tip, idx) => (
                            <li key={idx}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Save Controls */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsRecipeBuilderOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSaveRecipe}
                  disabled={isSavingRecipe}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSavingRecipe ? "Guardando Receta..." : "Guardar Receta en la Base de Datos"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PUBLISH TO STORE CATALOG */}
      {publishingRecipe && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-4 sm:p-6 relative shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setPublishingRecipe(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Publicar en Catálogo</h3>
                <p className="text-xs text-slate-400">{publishingRecipe.name}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Precio de Venta al Detal ($)</label>
                <input
                  type="number"
                  step="any"
                  value={publishSalePrice}
                  onChange={(e) => setPublishSalePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-emerald-400 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Precio de Venta al Mayor ($)</label>
                <input
                  type="number"
                  step="any"
                  value={publishWholesalePrice}
                  onChange={(e) => setPublishWholesalePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Categoría en Tienda</label>
                <select
                  value={publishCategory}
                  onChange={(e) => setPublishCategory(e.target.value as ProductCategory)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none"
                >
                  <option value={ProductCategory.Equipos}>Productos Sin Gluten</option>
                  <option value={ProductCategory.Accesorios}>Postres Saludables</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Stock Inicial de Productos Elaborados</label>
                <input
                  type="number"
                  value={publishStock}
                  onChange={(e) => setPublishStock(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setPublishingRecipe(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPublish}
                  disabled={isPublishing}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black uppercase transition-all"
                >
                  {isPublishing ? "Publicando..." : "Confirmar Publicación"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
