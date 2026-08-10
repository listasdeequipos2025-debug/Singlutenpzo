import React, { useState, useRef } from "react";
import { Product, ProductCategory } from "../types";
import {
  Plus, Minus, Edit, Trash2, Wheat, Cake, ShoppingBag, AlertTriangle, Search,
  UploadCloud, FileText, Check, X, RefreshCw, AlertCircle, Download
} from "lucide-react";
import * as XLSX from "xlsx";

function normalizeString(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

interface InventoryManagerProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, "id" | "createdAt">) => Promise<void>;
  onAddProductsBulk: (products: Omit<Product, "id" | "createdAt">[], shouldModifyStock?: boolean) => Promise<void>;
  onEditProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onDeleteProductsBulk?: (ids: string[]) => Promise<void>;
}

export default function InventoryManager({
  products,
  onAddProduct,
  onAddProductsBulk,
  onEditProduct,
  onDeleteProduct,
  onDeleteProductsBulk
}: InventoryManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "equipos" | "accesorios">("all");
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProductCategory>(ProductCategory.Equipos);
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [creditPrice, setCreditPrice] = useState("");
  const [referenceProfit, setReferenceProfit] = useState("");
  const [stock, setStock] = useState("");
  const [image, setImage] = useState("");

  // Bulk Upload states
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [parseError, setParseError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRefForImage = useRef<HTMLInputElement>(null);

  // Bulk Selection and Edit states
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkStockVal, setBulkStockVal] = useState("");
  const [bulkSalePriceVal, setBulkSalePriceVal] = useState("");
  const [bulkWholesalePriceVal, setBulkWholesalePriceVal] = useState("");
  const [bulkCreditPriceVal, setBulkCreditPriceVal] = useState("");
  const [bulkCostPriceVal, setBulkCostPriceVal] = useState("");

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

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        alert("La foto del producto supera el límite recomendado de 1.5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBulkDelete = () => {
    if (selectedProductIds.length === 0) return;
    askConfirmation(
      "Confirmar Eliminación Masiva",
      `¿Seguro que deseas eliminar los ${selectedProductIds.length} productos seleccionados? Esta acción no se puede deshacer y los borrará de forma permanente de tu inventario.`,
      async () => {
        try {
          if (onDeleteProductsBulk) {
            await onDeleteProductsBulk(selectedProductIds);
          } else {
            for (const id of selectedProductIds) {
              await onDeleteProduct(id);
            }
          }
          setSelectedProductIds([]);
        } catch (err) {
          console.error("Error deleting products in bulk:", err);
          alert("Hubo un error al eliminar los productos seleccionados.");
        }
      }
    );
  };

  const handleApplyBulkChanges = async () => {
    if (selectedProductIds.length === 0) return;
    const updates: Partial<Product> = {};
    if (bulkStockVal !== "") {
      const val = parseInt(bulkStockVal, 10);
      if (!isNaN(val)) updates.stock = val;
    }
    if (bulkSalePriceVal !== "") {
      const val = parseFloat(bulkSalePriceVal);
      if (!isNaN(val)) updates.salePrice = val;
    }
    if (bulkWholesalePriceVal !== "") {
      const val = parseFloat(bulkWholesalePriceVal);
      if (!isNaN(val)) updates.wholesalePrice = val;
    }
    if (bulkCreditPriceVal !== "") {
      const val = parseFloat(bulkCreditPriceVal);
      if (!isNaN(val)) updates.creditPrice = val;
    }
    if (bulkCostPriceVal !== "") {
      const val = parseFloat(bulkCostPriceVal);
      if (!isNaN(val)) updates.costPrice = val;
    }

    if (Object.keys(updates).length === 0) {
      alert("Por favor ingresa al menos un valor para actualizar de forma masiva.");
      return;
    }

    try {
      for (const id of selectedProductIds) {
        await onEditProduct(id, updates);
      }
      alert(`Se aplicaron los cambios correctamente a ${selectedProductIds.length} productos.`);
      setBulkStockVal("");
      setBulkSalePriceVal("");
      setBulkWholesalePriceVal("");
      setBulkCreditPriceVal("");
      setBulkCostPriceVal("");
      setSelectedProductIds([]);
    } catch (err) {
      console.error("Error applying bulk changes:", err);
      alert("Hubo un error al aplicar los cambios masivos.");
    }
  };

  // Quick Stock Edit states
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStockVal, setTempStockVal] = useState("");

  const handleQuickStockAdjust = async (id: string, newStock: number) => {
    try {
      await onEditProduct(id, { stock: newStock });
    } catch (err) {
      console.error("Error adjusting stock:", err);
    }
  };

  const handleSaveQuickStock = async (id: string) => {
    const parsedVal = parseInt(tempStockVal, 10);
    if (!isNaN(parsedVal)) {
      try {
        await onEditProduct(id, { stock: parsedVal });
      } catch (err) {
        console.error("Error saving stock:", err);
      }
    }
    setEditingStockId(null);
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAddForm = () => {
    setIsEditing(null);
    setName("");
    setCategory(ProductCategory.Equipos);
    setCostPrice("");
    setSalePrice("");
    setWholesalePrice("");
    setCreditPrice("");
    setReferenceProfit("");
    setStock("1");
    setImage("");
    setShowForm(true);
  };

  const handleOpenEditForm = (p: Product) => {
    setIsEditing(p.id);
    setName(p.name);
    setCategory(p.category);
    setCostPrice(p.costPrice ? p.costPrice.toString() : "");
    setSalePrice(p.salePrice.toString());
    setWholesalePrice(p.wholesalePrice ? p.wholesalePrice.toString() : "");
    setCreditPrice(p.creditPrice ? p.creditPrice.toString() : "");
    setReferenceProfit(p.referenceProfit ? p.referenceProfit.toString() : "");
    setStock(p.stock.toString());
    setImage(p.image || "");
    setShowForm(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedSalePrice = salePrice && !isNaN(parseFloat(salePrice)) ? parseFloat(salePrice) : 0;
    const parsedStock = stock && !isNaN(parseInt(stock, 10)) ? parseInt(stock, 10) : 0;
    const parsedCostPrice = costPrice && !isNaN(parseFloat(costPrice)) ? parseFloat(costPrice) : undefined;
    const parsedWholesalePrice = wholesalePrice && !isNaN(parseFloat(wholesalePrice)) ? parseFloat(wholesalePrice) : undefined;
    const parsedCreditPrice = creditPrice && !isNaN(parseFloat(creditPrice)) ? parseFloat(creditPrice) : undefined;
    const parsedReferenceProfit = referenceProfit && !isNaN(parseFloat(referenceProfit)) ? parseFloat(referenceProfit) : undefined;

    const data = {
      name: name.trim(),
      category,
      salePrice: parsedSalePrice,
      stock: parsedStock,
      costPrice: parsedCostPrice,
      wholesalePrice: parsedWholesalePrice,
      creditPrice: parsedCreditPrice,
      referenceProfit: parsedReferenceProfit,
      image: image || undefined
    };

    if (isEditing) {
      await onEditProduct(isEditing, data);
      setShowForm(false);
    } else {
      const normalizedNewName = normalizeString(name);
      const existing = products.find((p) => normalizeString(p.name) === normalizedNewName);

      if (existing) {
        // If the new stock is 0 or nonexistent/invalid, do not ask or sum; keep old stock, and close the form immediately
        if (!parsedStock || parsedStock <= 0) {
          const updatedData = {
            ...data,
            stock: existing.stock
          };
          await onEditProduct(existing.id, updatedData);
          setShowForm(false);
        } else {
          // New stock is > 0, so ask if they want to sum. Overlay the confirmation dialog on top of the add product form (do NOT close form yet)
          askConfirmation(
            "Producto ya registrado",
            `El producto "${existing.name}" ya se encuentra registrado en el inventario. ¿Deseas sumar el stock nuevo (${parsedStock}) al stock actual (${existing.stock})?\n\n• Si eliges "Sí, Sumar Stock", la cantidad total será ${existing.stock + parsedStock}.\n• Si eliges "No Sumar", el stock actual se mantendrá intacto (${existing.stock}) y solo se actualizarán los precios u otros datos del producto.`,
            async () => {
              // YES: Sum stock
              const updatedData = {
                ...data,
                stock: existing.stock + parsedStock
              };
              await onEditProduct(existing.id, updatedData);
              setShowForm(false); // Close form after saving
            },
            {
              confirmText: "Sí, Sumar Stock",
              cancelText: "No Sumar",
              type: "blue",
              onCancel: async () => {
                // NO: Keep existing stock, only update rest
                const updatedData = {
                  ...data,
                  stock: existing.stock
                };
                await onEditProduct(existing.id, updatedData);
                setShowForm(false); // Close form after saving
              }
            }
          );
        }
      } else {
        await onAddProduct(data);
        setShowForm(false);
      }
    }
  };

  const handleDeleteAllBulk = () => {
    const bulkProducts = products.filter((p) => p.isBulkUploaded);
    if (bulkProducts.length === 0) return;

    askConfirmation(
      "Eliminar Todo el Lote IA",
      `¿Seguro que deseas eliminar TODOS los ${bulkProducts.length} productos que fueron cargados en lote (Excel / PDF) con la IA? Esta acción es irreversible y los borrará de forma permanente de tu inventario.`,
      async () => {
        setIsDeletingBulk(true);
        try {
          if (onDeleteProductsBulk) {
            await onDeleteProductsBulk(bulkProducts.map((p) => p.id));
          } else {
            for (const p of bulkProducts) {
              await onDeleteProduct(p.id);
            }
          }
        } catch (err) {
          console.error("Error deleting bulk products:", err);
          alert("Ocurrió un error al intentar eliminar los productos en lote.");
        } finally {
          setIsDeletingBulk(false);
        }
      }
    );
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setParseError("");
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === "xlsx" || extension === "xls" || extension === "csv") {
      setMimeType("text/csv");
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csvText = XLSX.utils.sheet_to_csv(worksheet);
          
          if (!csvText || csvText.trim() === "") {
            setParseError("El archivo Excel o CSV parece estar vacío.");
            return;
          }
          
          setBulkText(csvText);
          setFileBase64(null); // No base64 needed for text files
        } catch (err) {
          console.error("Error al procesar archivo Excel con XLSX:", err);
          setParseError("No se pudo leer el archivo Excel/CSV localmente. Asegúrate de que tenga un formato correcto.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setMimeType(file.type || "application/octet-stream");
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(",")[1];
        setFileBase64(base64Data);
        setBulkText(""); // Clear text since we are sending base64 document
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleParseWithGemini = async () => {
    if (!bulkText && !fileBase64) {
      setParseError("Por favor, ingresa texto o carga un archivo Excel/PDF.");
      return;
    }

    setIsParsing(true);
    setParseError("");
    setParsedItems([]);

    try {
      const response = await fetch("/api/parse-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: fileBase64 || undefined,
          mimeType: mimeType || undefined,
          fileText: bulkText || undefined,
          parseType: "inventory_or_purchases"
        })
      });

      let data: any = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const textResponse = await response.text();
        throw new Error(textResponse || `Error del servidor (${response.status})`);
      }

      if (!response.ok) {
        let errMsg = data.error || "Error al procesar el archivo";
        const lowerErr = String(errMsg).toLowerCase();
        if (
          lowerErr.includes("503") ||
          lowerErr.includes("unavailable") ||
          lowerErr.includes("demand") ||
          lowerErr.includes("all gemini models failed") ||
          lowerErr.includes("limit") ||
          lowerErr.includes("agotado") ||
          lowerErr.includes("fetch failed")
        ) {
          errMsg = "La IA de Google (Gemini) está experimentando una alta demanda o indisponibilidad temporal en sus servidores. Por favor, espera unos segundos e intenta nuevamente, o ingresa los datos de los productos manualmente.";
        } else {
          try {
            if (typeof errMsg === "string" && (errMsg.startsWith("{") || errMsg.startsWith("["))) {
              const parsedErr = JSON.parse(errMsg);
              if (parsedErr.error && parsedErr.error.message) {
                if (parsedErr.error.code === 503) {
                  errMsg = "La IA de Google está experimentando una alta demanda temporal y no pudo procesar el archivo en este momento. Por favor, intenta de nuevo en unos segundos.";
                } else {
                  errMsg = parsedErr.error.message;
                }
              }
            }
          } catch (e) {}
        }
        throw new Error(errMsg);
      }

      if (data.items && Array.isArray(data.items)) {
        const normalized = data.items.map((item: any) => {
          let cat = "equipos";
          if (item.category) {
            const lowerCat = String(item.category).toLowerCase();
            if (lowerCat.includes("accesorio") || lowerCat === "accesorios" || lowerCat === "acc") {
              cat = "accesorios";
            }
          }
          return {
            ...item,
            category: cat
          };
        });
        setParsedItems(normalized);
      } else {
        throw new Error("Formato de respuesta incorrecto de la IA");
      }
    } catch (err: any) {
      setParseError(err.message || "Error al conectar con el servidor.");
    } finally {
      setIsParsing(false);
    }
  };

  const cleanPriceValue = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === "number") return isNaN(val) ? 0 : val;
    const str = String(val)
      .replace(/[^0-9.,-]/g, "") // Keep only digits, periods, commas, and minus sign
      .trim();
    
    if (!str) return 0;
    
    const hasComma = str.includes(",");
    const hasPeriod = str.includes(".");
    
    if (hasComma && hasPeriod) {
      if (str.indexOf(",") > str.indexOf(".")) {
        return parseFloat(str.replace(/\./g, "").replace(",", "."));
      } else {
        return parseFloat(str.replace(/,/g, ""));
      }
    } else if (hasComma) {
      const parts = str.split(",");
      if (parts.length === 2 && parts[1].length === 2) {
        return parseFloat(str.replace(",", "."));
      } else {
        return parseFloat(str.replace(/,/g, ""));
      }
    } else if (hasPeriod) {
      const periods = str.match(/\./g) || [];
      if (periods.length > 1) {
        return parseFloat(str.replace(/\./g, ""));
      }
    }
    
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleConfirmBulkAdd = async () => {
    if (parsedItems.length === 0 || isImporting) return;

    setIsImporting(true);
    setParseError("");
    try {
      // Filter valid items and map schema (only require name to be present)
      const cleanItems = parsedItems
        .filter((i) => i.name && i.name.trim() !== "")
        .map((i) => {
          const parsedSalePrice = i.salePrice !== undefined && i.salePrice !== null ? cleanPriceValue(i.salePrice) : 0;
          const parsedStock = Math.max(0, Math.round(cleanPriceValue(i.stock !== undefined && i.stock !== null ? i.stock : 0)));
          const parsedCostPrice = (i.costPrice !== undefined && i.costPrice !== null && i.costPrice !== "") ? cleanPriceValue(i.costPrice) : undefined;
          const parsedWholesalePrice = (i.wholesalePrice !== undefined && i.wholesalePrice !== null && i.wholesalePrice !== "") ? cleanPriceValue(i.wholesalePrice) : undefined;
          const parsedCreditPrice = (i.creditPrice !== undefined && i.creditPrice !== null && i.creditPrice !== "") ? cleanPriceValue(i.creditPrice) : undefined;
          const parsedReferenceProfit = (i.referenceProfit !== undefined && i.referenceProfit !== null && i.referenceProfit !== "") ? cleanPriceValue(i.referenceProfit) : undefined;

          const resObj: any = {
            name: i.name.trim(),
            category: i.category === "accesorios" ? ProductCategory.Accesorios : ProductCategory.Equipos,
            salePrice: parsedSalePrice,
            stock: parsedStock,
          };
          if (parsedCostPrice !== undefined && !isNaN(parsedCostPrice)) resObj.costPrice = parsedCostPrice;
          if (parsedWholesalePrice !== undefined && !isNaN(parsedWholesalePrice)) resObj.wholesalePrice = parsedWholesalePrice;
          if (parsedCreditPrice !== undefined && !isNaN(parsedCreditPrice)) resObj.creditPrice = parsedCreditPrice;
          if (parsedReferenceProfit !== undefined && !isNaN(parsedReferenceProfit)) resObj.referenceProfit = parsedReferenceProfit;
          if (i.image) resObj.image = i.image;

          return resObj;
        });

      // Find if there are already existing items in the inventory with a new stock > 0
      const existingConflictItems = cleanItems.filter((item) => {
        const normalizedNewName = normalizeString(item.name);
        const existing = products.find((p) => normalizeString(p.name) === normalizedNewName);
        return existing && item.stock !== undefined && item.stock > 0;
      });

      if (existingConflictItems.length > 0) {
        // Ask ONCE for all bulk loaded existing products
        askConfirmation(
          "Modificar Stock de Existentes",
          `Se han detectado ${existingConflictItems.length} productos que ya existen en tu inventario con cantidades de stock cargadas en el archivo.\n\n¿Deseas sumar el nuevo stock al stock actual de estos productos?\n\n• Si eliges "Sí, Modificar Stock", se adicionará la cantidad cargada al stock actual.\n• Si eliges "No Modificar", se mantendrá intacto el stock actual de estos productos (${existingConflictItems.map(item => `"${item.name}"`).slice(0, 3).join(", ")}${existingConflictItems.length > 3 ? "..." : ""}) y solo se actualizarán sus precios y demás datos.`,
          async () => {
            // YES: Modify/Sum stock
            setIsImporting(true);
            try {
              await onAddProductsBulk(cleanItems, true);
              setParsedItems([]);
              setBulkText("");
              setFileBase64(null);
              setFileName(null);
              setShowBulkUpload(false);
            } catch (err: any) {
              console.error("Error importing products:", err);
              setParseError(err.message || "Error al importar los productos. Por favor intente de nuevo.");
            } finally {
              setIsImporting(false);
            }
          },
          {
            confirmText: "Sí, Modificar Stock",
            cancelText: "No Modificar",
            type: "blue",
            onCancel: async () => {
              // NO: Do not modify stock, keep old stock, only update other properties
              setIsImporting(true);
              try {
                await onAddProductsBulk(cleanItems, false);
                setParsedItems([]);
                setBulkText("");
                setFileBase64(null);
                setFileName(null);
                setShowBulkUpload(false);
              } catch (err: any) {
                console.error("Error importing products:", err);
                setParseError(err.message || "Error al importar los productos. Por favor intente de nuevo.");
              } finally {
                setIsImporting(false);
              }
            }
          }
        );
        // Turn off importing state so user doesn't get blocked before modal choice
        setIsImporting(false);
        return;
      }

      // No conflict products with stock > 0, do not prompt anything, just upload!
      await onAddProductsBulk(cleanItems, false);
      // Reset bulk uploader states
      setParsedItems([]);
      setBulkText("");
      setFileBase64(null);
      setFileName(null);
      setShowBulkUpload(false);
    } catch (err: any) {
      console.error("Error importing products:", err);
      setParseError(err.message || "Error al importar los productos. Por favor intente de nuevo.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportToExcel = () => {
    const exportData = products.map((p) => {
      const estProfit = p.costPrice ? (p.salePrice - p.costPrice) : (p.referenceProfit || 0);
      return {
        "Nombre del Producto": p.name,
        "Categoría": p.category === ProductCategory.Equipos ? "Productos Sin Gluten" : "Postres Saludables",
        "Stock Disponible": p.stock,
        "Precio de Costo ($)": p.costPrice !== undefined ? p.costPrice : "No asignado",
        "Precio de Contado (Detal) ($)": p.salePrice,
        "Precio al Mayor ($)": p.wholesalePrice !== undefined ? p.wholesalePrice : p.salePrice,
        "Precio a Crédito ($)": p.creditPrice !== undefined ? p.creditPrice : p.salePrice,
        "Ganancia Estimada / Referencial ($)": estProfit
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario Completo");

    // Adjust column widths automatically
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

    XLSX.writeFile(workbook, "Inventario_SinGlutenpzo_Precios.xlsx");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gestión de Inventario</h2>
          <p className="text-sm text-slate-500">Carga, edita y controla la disponibilidad en tiempo real</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportToExcel}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-emerald-500/25"
            title="Descargar todo el inventario de productos en formato Excel"
          >
            <Download className="h-4 w-4" />
            <span>Descargar Inventario (Excel)</span>
          </button>
          <button
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600/10 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-500/20 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Carga Masiva IA</span>
          </button>
          <button
            onClick={handleOpenAddForm}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-blue-500/25"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[80] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-3xl p-4 sm:p-6 shadow-2xl space-y-6 max-h-[92vh] my-auto overflow-y-auto border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <UploadCloud className="h-5 w-5 text-blue-600" />
                  <span>Carga Masiva de Productos con IA</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Sube un Excel, PDF, Imagen o pega una lista de texto</p>
              </div>
              <button
                onClick={() => {
                  setShowBulkUpload(false);
                  setParsedItems([]);
                  setParseError("");
                  setFileName(null);
                  setFileBase64(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {parsedItems.length === 0 ? (
              <div className="space-y-4">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={triggerFileSelect}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/20 p-8 rounded-2xl text-center cursor-pointer transition-all space-y-3"
                >
                  <UploadCloud className="h-10 w-10 text-blue-500 mx-auto" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">
                      {fileName ? `Archivo seleccionado: ${fileName}` : "Arrastra tu archivo aquí o haz clic para buscar"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Soporta .xlsx, .pdf, .png, .jpg, .csv o archivos de texto</p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg"
                  />
                </div>

                {/* Text Area copy paste */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">O pega el texto directo de las compras</label>
                  <textarea
                    rows={4}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="Ejemplo:&#10;Celular Samsung S23 ultra 5 unids venta $900 costo $700&#10;Carcasa iPhone 15 Pro Max 15 unids venta $25 ganancia $15"
                    className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-sm font-medium transition-all outline-none"
                  />
                </div>

                {parseError && (
                  <div className="flex items-center space-x-2 bg-rose-50 border border-rose-100 text-rose-600 text-xs p-3 rounded-xl">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{parseError}</span>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setShowBulkUpload(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 uppercase hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleParseWithGemini}
                    disabled={isParsing}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md"
                  >
                    {isParsing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Analizando con IA...</span>
                      </>
                    ) : (
                      <span>Procesar con IA</span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Review Parsed Items before committing */
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-700">Verifica los productos extraídos por la IA</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto max-h-[40vh]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                        <th className="p-3">Producto</th>
                        <th className="p-3">Categoría</th>
                        <th className="p-3">Stock</th>
                        <th className="p-3">Precio Venta</th>
                        <th className="p-3">Costo ($)</th>
                        <th className="p-3">G. Ref ($)</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-slate-100">
                      {parsedItems.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="p-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const copy = [...parsedItems];
                                copy[index].name = e.target.value;
                                setParsedItems(copy);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:bg-white"
                            />
                          </td>
                          <td className="p-3">
                            <select
                              value={item.category}
                              onChange={(e) => {
                                const copy = [...parsedItems];
                                copy[index].category = e.target.value;
                                setParsedItems(copy);
                              }}
                              className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-600"
                            >
                              <option value="equipos">Productos Sin Gluten</option>
                              <option value="accesorios">Postres Saludables</option>
                            </select>
                          </td>
                          <td className="p-3 w-20">
                            <input
                              type="number"
                              value={item.stock !== undefined && item.stock !== null ? item.stock : ""}
                              onChange={(e) => {
                                const copy = [...parsedItems];
                                copy[index].stock = e.target.value === "" ? "" : Number(e.target.value);
                                setParsedItems(copy);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-center"
                            />
                          </td>
                          <td className="p-3 w-28">
                            <input
                              type="number"
                              value={item.salePrice !== undefined && item.salePrice !== null ? item.salePrice : ""}
                              onChange={(e) => {
                                const copy = [...parsedItems];
                                copy[index].salePrice = e.target.value === "" ? "" : Number(e.target.value);
                                setParsedItems(copy);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1"
                            />
                          </td>
                          <td className="p-3 w-24">
                            <input
                              type="number"
                              value={item.costPrice || ""}
                              placeholder="Sin costo"
                              onChange={(e) => {
                                const copy = [...parsedItems];
                                copy[index].costPrice = e.target.value ? Number(e.target.value) : null;
                                setParsedItems(copy);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1"
                            />
                          </td>
                          <td className="p-3 w-24">
                            <input
                              type="number"
                              value={item.referenceProfit || ""}
                              placeholder="Autocalc"
                              onChange={(e) => {
                                const copy = [...parsedItems];
                                copy[index].referenceProfit = e.target.value ? Number(e.target.value) : null;
                                setParsedItems(copy);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1"
                            />
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => {
                                setParsedItems(parsedItems.filter((_, idx) => idx !== index));
                              }}
                              className="text-rose-500 hover:bg-rose-50 p-1 rounded-full"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-400">Se detectaron {parsedItems.length} productos listos para importar.</p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setParsedItems([])}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 uppercase"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleConfirmBulkAdd}
                      disabled={isImporting}
                      className="flex items-center space-x-1.5 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md transition-all"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Importando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Confirmar e Importar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Add / Edit Form Modal */}
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
              <Wheat className="h-5 w-5 text-emerald-600" />
              <span>{isEditing ? "Editar Producto" : "Nuevo Producto"}</span>
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Harina de Yuca Sin Gluten 1kg"
                  className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none cursor-pointer"
                  >
                    <option value={ProductCategory.Equipos}>Productos Sin Gluten</option>
                    <option value={ProductCategory.Accesorios}>Postres Saludables</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Stock Inicial</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Precio Venta (Detal) ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="Ej: 899 (Opcional)"
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Precio al Mayor ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={wholesalePrice}
                    onChange={(e) => setWholesalePrice(e.target.value)}
                    placeholder="Ej: 850 (Opcional)"
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Precio a Crédito ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={creditPrice}
                    onChange={(e) => setCreditPrice(e.target.value)}
                    placeholder="Ej: 950 (Opcional)"
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <p className="text-[11px] text-slate-400 font-medium">
                  * Registra el costo para calcular las ganancias reales de venta. Si es sin costo, provee la Ganancia Referencial.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Precio de Costo ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={costPrice}
                      onChange={(e) => {
                        setCostPrice(e.target.value);
                        if (e.target.value) setReferenceProfit(""); // Clear ref if cost exists
                      }}
                      placeholder="Ej: 650 (Oculto)"
                      className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">G. Referencial ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={referenceProfit}
                      disabled={!!costPrice}
                      onChange={(e) => setReferenceProfit(e.target.value)}
                      placeholder="Ej: 200"
                      className="w-full p-3 bg-slate-50 border border-slate-200 disabled:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase block">Foto del Producto (Opcional)</label>
                <div className="flex items-center gap-3">
                  {image ? (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-50">
                      <img src={image} alt="Vista previa" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImage("")}
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white p-0.5 rounded-full hover:bg-red-600 shadow-sm transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center flex-shrink-0 text-slate-400">
                      <Wheat className="h-6 w-6 text-emerald-500" />
                    </div>
                  )}
                  <div className="flex-grow space-y-1">
                    <button
                      type="button"
                      onClick={() => fileInputRefForImage.current?.click()}
                      className="flex items-center space-x-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-black transition-colors border border-blue-100"
                    >
                      <UploadCloud className="h-4 w-4 text-blue-600" />
                      <span>Explorar Foto/Imagen</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRefForImage}
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                    <p className="text-[9px] text-slate-400 font-bold leading-none">Formatos: PNG, JPG, GIF. Máx 1.5MB.</p>
                  </div>
                </div>
                <input
                  type="text"
                  value={image.startsWith("data:") ? "" : image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="O pega una URL de imagen aquí..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-200 rounded-lg text-xs font-medium transition-all outline-none"
                />
              </div>

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
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Grid: Filters & Search */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-bold transition-all outline-none"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                categoryFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setCategoryFilter("equipos")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                categoryFilter === "equipos"
                  ? "bg-emerald-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Sin Gluten
            </button>
            <button
              onClick={() => setCategoryFilter("accesorios")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                categoryFilter === "accesorios"
                  ? "bg-orange-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Postres Saludables
            </button>
          </div>
        </div>

        {products.filter((p) => p.isBulkUploaded).length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-blue-50/70 border border-blue-100 rounded-2xl p-4 text-blue-800 animate-fade-in">
            <div className="flex items-center space-x-2.5">
              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold">Se detectaron {products.filter((p) => p.isBulkUploaded).length} productos cargados mediante Carga Masiva IA (Excel/PDF)</p>
                <p className="text-[10px] text-blue-600/80 font-medium">Puedes eliminarlos uno por uno usando el ícono de papelera en cada fila, o borrarlos todos de una sola vez.</p>
              </div>
            </div>
            <button
              onClick={handleDeleteAllBulk}
              disabled={isDeletingBulk}
              className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-400 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md shadow-rose-200"
            >
              <Trash2 className="h-4 w-4" />
              <span>{isDeletingBulk ? "Eliminando..." : "Eliminar Lote Completo"}</span>
            </button>
          </div>
        )}

        {/* Bulk Selection Actions Panel */}
        {selectedProductIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 text-blue-950 space-y-4 animate-fade-in my-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <Check className="h-5 w-5 text-blue-700 bg-blue-100 p-1 rounded-full flex-shrink-0" />
                <div>
                  <p className="text-xs font-black">Acciones de Selección Múltiple: {selectedProductIds.length} productos seleccionados</p>
                  <p className="text-[10px] text-blue-600 font-semibold">Modifica los campos indicados o elimina todos los productos seleccionados de forma masiva.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProductIds([])}
                  className="px-3 py-1.5 text-[10px] font-bold uppercase text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Deseleccionar todos
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-rose-200 animate-pulse"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Eliminar Seleccionados ({selectedProductIds.length})</span>
                </button>
              </div>
            </div>

            {/* Bulk Manual Modifier Form */}
            <div className="space-y-2">
              <p className="text-[10px] text-blue-700 font-black uppercase tracking-wider">Actualizar Campos (Solo se guardará lo que escribas):</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500">Nuevo Stock</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ej: 15"
                    value={bulkStockVal}
                    onChange={(e) => setBulkStockVal(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-blue-200/60 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500">Precio Venta (Detal)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Ej: 500"
                    value={bulkSalePriceVal}
                    onChange={(e) => setBulkSalePriceVal(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-blue-200/60 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500">Precio al Mayor</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Ej: 480"
                    value={bulkWholesalePriceVal}
                    onChange={(e) => setBulkWholesalePriceVal(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-blue-200/60 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500">Precio Crédito</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Ej: 550"
                    value={bulkCreditPriceVal}
                    onChange={(e) => setBulkCreditPriceVal(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-blue-200/60 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500">Precio de Costo</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Ej: 400"
                    value={bulkCostPriceVal}
                    onChange={(e) => setBulkCostPriceVal(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-blue-200/60 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleApplyBulkChanges}
                  className="flex items-center space-x-1.5 px-4.5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-blue-200"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Aplicar Cambios Masivos</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 bg-slate-50/50">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProductIds(filteredProducts.map((p) => p.id));
                      } else {
                        setSelectedProductIds([]);
                      }
                    }}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                  />
                </th>
                <th className="p-4">Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Costo ($)</th>
                <th className="p-4">Precio Venta ($)</th>
                <th className="p-4">G. Estimada ($)</th>
                <th className="p-4">Stock disponible</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredProducts.map((p) => {
                const estProfit = p.costPrice ? (p.salePrice - p.costPrice) : (p.referenceProfit || 0);

                return (
                  <tr key={p.id} className={`hover:bg-slate-50/50 ${selectedProductIds.includes(p.id) ? "bg-blue-50/30" : ""}`}>
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProductIds((prev) => [...prev, p.id]);
                          } else {
                            setSelectedProductIds((prev) => prev.filter((id) => id !== p.id));
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        {p.image && (
                          <img
                            src={p.image}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 object-cover rounded-lg border border-slate-100"
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800">{p.name}</span>
                            {p.isBulkUploaded && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded text-[9px] font-bold text-blue-600 uppercase tracking-wider" title="Cargado vía Excel/PDF con IA">
                                <FileText className="h-2.5 w-2.5" />
                                <span>Lote IA</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">ID: {p.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        p.category === ProductCategory.Equipos
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-amber-50 border-amber-200 text-amber-800"
                      }`}>
                        {p.category === ProductCategory.Equipos ? <Wheat className="h-3 w-3 text-emerald-600" /> : <Cake className="h-3 w-3 text-amber-600" />}
                        <span>{p.category === ProductCategory.Equipos ? "Productos Sin Gluten" : "Postres Saludables"}</span>
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">
                      {p.costPrice ? `$${p.costPrice.toLocaleString()}` : <span className="text-slate-400 italic">No asignado</span>}
                    </td>
                    <td className="p-4">
                      <div className="font-extrabold text-slate-900" title="Precio al detal">${p.salePrice.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400 font-medium space-y-0.5 mt-0.5">
                        <p>Mayor: <span className="font-semibold text-slate-600">${(p.wholesalePrice ?? p.salePrice).toLocaleString()}</span></p>
                        <p>Crédito: <span className="font-semibold text-slate-600">${(p.creditPrice ?? p.salePrice).toLocaleString()}</span></p>
                      </div>
                    </td>
                    <td className="p-4 text-emerald-600 font-extrabold">
                      +${estProfit.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200/60 p-1 rounded-xl w-fit">
                        {/* Decrement Button */}
                        <button
                          type="button"
                          onClick={() => handleQuickStockAdjust(p.id, p.stock - 1)}
                          disabled={p.stock <= 0}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Restar 1 unidad"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>

                        {/* Inline Input or Stock Badge */}
                        {editingStockId === p.id ? (
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              min="0"
                              value={tempStockVal}
                              onChange={(e) => setTempStockVal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveQuickStock(p.id);
                                } else if (e.key === "Escape") {
                                  setEditingStockId(null);
                                }
                              }}
                              className="w-12 text-center bg-white border border-slate-200 rounded-md text-xs font-extrabold py-0.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                              autoFocus
                              onBlur={() => handleSaveQuickStock(p.id)}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveQuickStock(p.id)}
                              className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-all"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStockId(p.id);
                              setTempStockVal(p.stock.toString());
                            }}
                            className="group flex items-center space-x-1 px-2 py-0.5 rounded-md hover:bg-slate-200 transition-all"
                            title="Haga clic para editar cantidad directamente"
                          >
                            {p.stock === 0 ? (
                              <span className="flex items-center space-x-1 text-rose-600 font-extrabold uppercase text-[10px] animate-pulse">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Agotado</span>
                              </span>
                            ) : (
                              <span className={`text-xs font-black ${
                                p.stock <= 3
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }`}>
                                {p.stock} unids.
                              </span>
                            )}
                            <Edit className="h-2.5 w-2.5 text-slate-300 group-hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100" />
                          </button>
                        )}

                        {/* Increment Button */}
                        <button
                          type="button"
                          onClick={() => handleQuickStockAdjust(p.id, p.stock + 1)}
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all"
                          title="Sumar 1 unidad"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEditForm(p)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            askConfirmation(
                              "Eliminar Producto",
                              `¿Estás seguro de que deseas eliminar "${p.name}" del inventario de forma permanente?`,
                              async () => {
                                try {
                                  await onDeleteProduct(p.id);
                                } catch (err) {
                                  console.error("Error deleting product:", err);
                                  alert("No se pudo eliminar el producto.");
                                }
                              }
                            );
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    No hay productos cargados en esta categoría.
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
              {confirmModal.type === "blue" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Volver a Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                      if (confirmModal.onCancel) confirmModal.onCancel();
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors font-semibold"
                  >
                    {confirmModal.cancelText || "No Sumar"}
                  </button>
                  <button
                    type="button"
                    onClick={confirmModal.onConfirm}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-blue-200"
                  >
                    {confirmModal.confirmText || "Sí, Sumar Stock"}
                  </button>
                </>
              ) : (
                <>
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
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-rose-200"
                  >
                    {confirmModal.confirmText || "Sí, Eliminar"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
