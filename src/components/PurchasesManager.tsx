import React, { useState, useRef } from "react";
import { Purchase, PurchaseType, PurchaseStatus, ProductCategory, Provider } from "../types";
import {
  FileText, Search, Plus, Calendar, CreditCard, DollarSign, Check, X,
  AlertTriangle, UploadCloud, RefreshCw, Eye, CheckCircle2, AlertCircle, Trash2, Edit, Download, Truck, Clock
} from "lucide-react";
import * as XLSX from "xlsx";

interface PurchasesManagerProps {
  purchases: Purchase[];
  onAddPurchase: (purchase: Omit<Purchase, "id" | "createdAt">) => Promise<void>;
  onAddPurchasesBulk: (purchases: Omit<Purchase, "id" | "createdAt">[]) => Promise<void>;
  onPayPurchase: (id: string) => Promise<void>;
  onDeletePurchase: (id: string) => Promise<void>;
  onEditPurchase?: (id: string, updates: Partial<Purchase>) => Promise<void>;
  providers?: Provider[];
  onAddProvider?: (provider: Omit<Provider, "id" | "createdAt">) => Promise<void>;
  onEditProvider?: (id: string, updates: Partial<Provider>) => Promise<void>;
  onDeleteProvider?: (id: string) => Promise<void>;
}

export default function PurchasesManager({
  purchases,
  onAddPurchase,
  onAddPurchasesBulk,
  onPayPurchase,
  onDeletePurchase,
  onEditPurchase,
  providers = [],
  onAddProvider,
  onEditProvider,
  onDeleteProvider
}: PurchasesManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pagado" | "pendiente">("all");
  const [activeSubTab, setActiveSubTab] = useState<"compras" | "proveedores">("compras");

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

  // Provider Form States
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [providerPhone, setProviderPhone] = useState("");
  const [providerEmail, setProviderEmail] = useState("");
  const [providerAddress, setProviderAddress] = useState("");
  const [providerRif, setProviderRif] = useState("");
  const [providerNotes, setProviderNotes] = useState("");
  const [providerError, setProviderError] = useState("");
  const [isSubmittingProvider, setIsSubmittingProvider] = useState(false);

  // Edit Provider States
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [editProviderName, setEditProviderName] = useState("");
  const [editProviderPhone, setEditProviderPhone] = useState("");
  const [editProviderEmail, setEditProviderEmail] = useState("");
  const [editProviderAddress, setEditProviderAddress] = useState("");
  const [editProviderRif, setEditProviderRif] = useState("");
  const [editProviderNotes, setEditProviderNotes] = useState("");

  const handleCreateProviderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProviderError("");

    if (!providerName.trim()) {
      setProviderError("El nombre del proveedor es requerido.");
      return;
    }

    if (!onAddProvider) {
      setProviderError("La función de añadir proveedor no está disponible.");
      return;
    }

    setIsSubmittingProvider(true);
    try {
      await onAddProvider({
        name: providerName.trim(),
        phone: providerPhone.trim(),
        email: providerEmail.trim(),
        address: providerAddress.trim(),
        rif: providerRif.trim(),
        notes: providerNotes.trim()
      });

      // Clear states
      setShowProviderForm(false);
      setProviderName("");
      setProviderPhone("");
      setProviderEmail("");
      setProviderAddress("");
      setProviderRif("");
      setProviderNotes("");
    } catch (err: any) {
      setProviderError(err.message || "Error al registrar proveedor.");
    } finally {
      setIsSubmittingProvider(false);
    }
  };

  const handleEditProviderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvider || !onEditProvider) return;

    if (!editProviderName.trim()) {
      alert("El nombre del proveedor es requerido.");
      return;
    }

    try {
      await onEditProvider(editingProvider.id, {
        name: editProviderName.trim(),
        phone: editProviderPhone.trim(),
        email: editProviderEmail.trim(),
        address: editProviderAddress.trim(),
        rif: editProviderRif.trim(),
        notes: editProviderNotes.trim()
      });
      setEditingProvider(null);
    } catch (err: any) {
      alert("Error al actualizar proveedor: " + (err.message || err));
    }
  };

  const handleExportProvidersToExcel = () => {
    const exportData = providers.map((p) => {
      return {
        "Nombre del Proveedor": p.name,
        "RIF / Cédula": p.rif || "N/A",
        "Teléfono": p.phone || "N/A",
        "Correo Electrónico": p.email || "N/A",
        "Dirección": p.address || "N/A",
        "Notas": p.notes || "N/A"
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Proveedores");

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

    XLSX.writeFile(workbook, "Reporte_Proveedores_SinGlutenpzo.xlsx");
  };

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [provider, setProvider] = useState("");
  const [providerRifInput, setProviderRifInput] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [type, setType] = useState<PurchaseType>(PurchaseType.Contado);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [formError, setFormError] = useState("");

  // Detected matching registered provider
  const matchedProvider = React.useMemo(() => {
    const pName = provider.trim().toLowerCase();
    const pRifClean = providerRifInput.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (!pName && !pRifClean) return null;

    return providers.find((p) => {
      const cleanR = (p.rif || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (pRifClean && pRifClean.length >= 3 && cleanR.includes(pRifClean)) return true;
      if (pName && pName.length >= 2 && p.name.toLowerCase().includes(pName)) return true;
      return false;
    }) || null;
  }, [provider, providerRifInput, providers]);

  const applyProviderData = (p: Provider) => {
    setProvider(p.name);
    if (p.rif) setProviderRifInput(p.rif);
  };

  // Invoice attachment & currency conversion states
  const [currency, setCurrency] = useState<"USD" | "VES">("USD");
  const [bcvRate, setBcvRate] = useState("");
  const [originalAmountVES, setOriginalAmountVES] = useState("");
  const [invoiceImage, setInvoiceImage] = useState<string | null>(null);
  const [invoiceImageName, setInvoiceImageName] = useState<string | null>(null);
  const [selectedInvoicePhoto, setSelectedInvoicePhoto] = useState<string | null>(null);

  // Edit Purchase states
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [editInvoiceNumber, setEditInvoiceNumber] = useState("");
  const [editProvider, setEditProvider] = useState("");
  const [editTotalAmount, setEditTotalAmount] = useState("");
  const [editType, setEditType] = useState<PurchaseType>(PurchaseType.Contado);
  const [editStatus, setEditStatus] = useState<PurchaseStatus>(PurchaseStatus.Pagado);
  const [editCurrency, setEditCurrency] = useState<"USD" | "VES">("USD");
  const [editBcvRate, setEditBcvRate] = useState("");
  const [editOriginalAmountVES, setEditOriginalAmountVES] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editFormError, setEditFormError] = useState("");

  const handleOpenEditPurchase = (p: Purchase) => {
    setEditingPurchase(p);
    setEditInvoiceNumber(p.invoiceNumber || "");
    setEditProvider(p.provider || "");
    setEditTotalAmount(String(p.totalAmount || 0));
    setEditType(p.type || PurchaseType.Contado);
    setEditStatus(p.status || PurchaseStatus.Pagado);
    setEditCurrency(p.currency || "USD");
    setEditBcvRate(String(p.bcvRate || ""));
    setEditOriginalAmountVES(String(p.originalAmountVES || ""));
    setEditDate(p.date || "");
    setEditFormError("");
  };

  const handleEditPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase || !onEditPurchase) return;

    if (!editInvoiceNumber.trim() || !editProvider.trim()) {
      setEditFormError("Por favor completa los campos de factura y proveedor.");
      return;
    }

    let finalAmount = 0;
    let bcvRateVal: number | undefined = undefined;
    let originalVESVal: number | undefined = undefined;

    if (editCurrency === "USD") {
      finalAmount = parseFloat(editTotalAmount);
      if (isNaN(finalAmount) || finalAmount <= 0) {
        setEditFormError("El monto total en USD debe ser un número válido mayor que cero.");
        return;
      }
    } else {
      const rate = parseFloat(editBcvRate);
      const vesAmount = parseFloat(editOriginalAmountVES);
      if (isNaN(rate) || rate <= 0) {
        setEditFormError("La tasa BCV debe ser un número válido mayor que cero.");
        return;
      }
      if (isNaN(vesAmount) || vesAmount <= 0) {
        setEditFormError("El monto en VES debe ser un número válido mayor que cero.");
        return;
      }
      bcvRateVal = rate;
      originalVESVal = vesAmount;
      finalAmount = parseFloat((vesAmount / rate).toFixed(2));
    }

    const updates: Partial<Purchase> = {
      invoiceNumber: editInvoiceNumber.trim(),
      provider: editProvider.trim(),
      totalAmount: finalAmount,
      type: editType,
      status: editStatus,
      currency: editCurrency,
      bcvRate: bcvRateVal,
      originalAmountVES: originalVESVal,
      date: editDate || editingPurchase.date
    };

    try {
      await onEditPurchase(editingPurchase.id, updates);
      setEditingPurchase(null);
    } catch (err: any) {
      setEditFormError(err.message || "Error al actualizar la compra");
    }
  };

  const invoicePhotoInputRef = useRef<HTMLInputElement>(null);

  const handleInvoicePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInvoiceImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const rawResult = reader.result as string;
      // Compress image using canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.7);
          setInvoiceImage(compressed);
        } else {
          setInvoiceImage(rawResult);
        }
      };
      img.onerror = () => {
        setInvoiceImage(rawResult);
      };
      img.src = rawResult;
    };
    reader.readAsDataURL(file);
  };

  // Bulk uploader states
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPurchases, setParsedPurchases] = useState<any[]>([]);
  const [parseError, setParseError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Provider Bulk uploader states and handlers
  const [showProviderBulkUpload, setShowProviderBulkUpload] = useState(false);
  const [providerBulkText, setProviderBulkText] = useState("");
  const [providerFileBase64, setProviderFileBase64] = useState<string | null>(null);
  const [providerMimeType, setProviderMimeType] = useState<string | null>(null);
  const [providerFileName, setProviderFileName] = useState<string | null>(null);
  const [isParsingProviders, setIsParsingProviders] = useState(false);
  const [parsedProviders, setParsedProviders] = useState<any[]>([]);
  const [selectedParsedProviders, setSelectedParsedProviders] = useState<boolean[]>([]);
  const [providerParseError, setProviderParseError] = useState("");
  const [isImportingProviders, setIsImportingProviders] = useState(false);
  const providerFileInputRef = useRef<HTMLInputElement>(null);

  // Multi-selection states for providers
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [showProviderBulkEditModal, setShowProviderBulkEditModal] = useState(false);
  const [bulkEditProviders, setBulkEditProviders] = useState<{
    id: string;
    name: string;
    rif: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
  }[]>([]);
  const [isSavingProviderBulkEdit, setIsSavingProviderBulkEdit] = useState(false);

  const handleToggleProviderSelection = (id: string) => {
    setSelectedProviderIds(prev =>
      prev.includes(id)
        ? prev.filter(pId => pId !== id)
        : [...prev, id]
    );
  };

  const handleToggleAllProviders = (filteredList: any[]) => {
    const filteredIds = filteredList.map(p => p.id);
    const areAllSelected = filteredIds.length > 0 && filteredIds.every(id => selectedProviderIds.includes(id));
    
    if (areAllSelected) {
      setSelectedProviderIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedProviderIds(prev => {
        const union = new Set([...prev, ...filteredIds]);
        return Array.from(union);
      });
    }
  };

  const handleDeleteSelectedProviders = () => {
    if (!onDeleteProvider) return;
    const count = selectedProviderIds.length;
    askConfirmation(
      "Confirmar Eliminación Masiva",
      `¿Estás seguro de que deseas eliminar masivamente a los ${count} proveedores seleccionados?`,
      async () => {
        try {
          for (const id of selectedProviderIds) {
            await onDeleteProvider(id);
          }
          setSelectedProviderIds([]);
          alert(`${count} proveedores eliminados con éxito.`);
        } catch (err) {
          console.error(err);
          alert("Ocurrió un error al intentar eliminar algunos proveedores.");
        }
      }
    );
  };

  const handleOpenProviderBulkEditModal = () => {
    const providersToEdit = providers
      .filter(p => selectedProviderIds.includes(p.id))
      .map(p => ({
        id: p.id,
        name: p.name,
        rif: p.rif || "",
        phone: p.phone || "",
        email: p.email || "",
        address: p.address || "",
        notes: p.notes || "",
      }));
    setBulkEditProviders(providersToEdit);
    setShowProviderBulkEditModal(true);
  };

  const handleSaveProviderBulkEdit = async () => {
    if (!onEditProvider) return;
    setIsSavingProviderBulkEdit(true);
    try {
      for (const item of bulkEditProviders) {
        await onEditProvider(item.id, {
          name: item.name.trim(),
          rif: item.rif.trim(),
          phone: item.phone.trim(),
          email: item.email.trim(),
          address: item.address.trim(),
          notes: item.notes.trim(),
        });
      }
      setShowProviderBulkEditModal(false);
      setSelectedProviderIds([]);
      alert("Proveedores actualizados con éxito de forma masiva.");
    } catch (err: any) {
      console.error(err);
      alert("Error al actualizar proveedores masivamente: " + (err.message || err));
    } finally {
      setIsSavingProviderBulkEdit(false);
    }
  };

  const processProviderFile = (file: File) => {
    setProviderFileName(file.name);
    setProviderParseError("");
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === "xlsx" || extension === "xls" || extension === "csv") {
      setProviderMimeType("text/csv");
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csvText = XLSX.utils.sheet_to_csv(worksheet);
          
          if (!csvText || csvText.trim() === "") {
            setProviderParseError("El archivo Excel o CSV parece estar vacío.");
            return;
          }
          
          setProviderBulkText(csvText);
          setProviderFileBase64(null);
        } catch (err) {
          console.error("Error al procesar archivo Excel de proveedores:", err);
          setProviderParseError("No se pudo leer el archivo Excel/CSV localmente.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setProviderMimeType(file.type || "application/octet-stream");
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(",")[1];
        setProviderFileBase64(base64Data);
        setProviderBulkText("");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProviderFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processProviderFile(file);
  };

  const handleParseProvidersWithGemini = async () => {
    if (!providerBulkText && !providerFileBase64) {
      setProviderParseError("Por favor ingresa un texto o sube un archivo Excel/PDF.");
      return;
    }

    setIsParsingProviders(true);
    setProviderParseError("");
    setParsedProviders([]);

    try {
      const response = await fetch("/api/parse-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: providerFileBase64 || undefined,
          mimeType: providerMimeType || undefined,
          fileText: providerBulkText || undefined,
          parseType: "providers"
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
          errMsg = "La IA de Google (Gemini) está experimentando una alta demanda o indisponibilidad temporal. Por favor, espera unos segundos e intenta nuevamente.";
        }
        throw new Error(errMsg);
      }

      if (data.providers && Array.isArray(data.providers)) {
        setParsedProviders(data.providers);
        setSelectedParsedProviders(new Array(data.providers.length).fill(true));
      } else {
        throw new Error("La IA no devolvió un formato válido de proveedores.");
      }
    } catch (err: any) {
      setProviderParseError(err.message || "Error al conectar con el servidor.");
    } finally {
      setIsParsingProviders(false);
    }
  };

  const handleConfirmImportProviders = async () => {
    if (parsedProviders.length === 0 || isImportingProviders || !onAddProvider) return;

    setIsImportingProviders(true);
    setProviderParseError("");

    try {
      let importedCount = 0;
      for (let i = 0; i < parsedProviders.length; i++) {
        if (!selectedParsedProviders[i]) continue;

        const prov = parsedProviders[i];
        if (!prov.name || !prov.name.trim()) continue;

        await onAddProvider({
          name: prov.name.trim(),
          phone: prov.phone || "N/A",
          email: prov.email || "",
          address: prov.address || "N/A",
          rif: prov.rif || "",
          notes: prov.notes || ""
        });
        importedCount++;
      }

      setShowProviderBulkUpload(false);
      setParsedProviders([]);
      setProviderBulkText("");
      setProviderFileBase64(null);
      setProviderFileName(null);
      alert(`¡Se importaron exitosamente ${importedCount} proveedores con la IA!`);
    } catch (err: any) {
      setProviderParseError(err.message || "Error al importar proveedores.");
    } finally {
      setIsImportingProviders(false);
    }
  };

  // Filter purchases
  const filteredPurchases = purchases.filter((p) => {
    const matchesSearch = p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.provider.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!invoiceNumber.trim() || !provider.trim()) {
      setFormError("Por favor completa todos los campos.");
      return;
    }

    let finalAmount = 0;
    let bcvRateVal: number | undefined = undefined;
    let originalVESVal: number | undefined = undefined;

    if (currency === "USD") {
      if (!totalAmount) {
        setFormError("Por favor ingresa el monto total.");
        return;
      }
      finalAmount = parseFloat(totalAmount);
      if (isNaN(finalAmount) || finalAmount <= 0) {
        setFormError("El monto debe ser un número válido mayor que cero.");
        return;
      }
    } else {
      if (!originalAmountVES || !bcvRate) {
        setFormError("Por favor ingresa el monto en Bolívares y la tasa del BCV.");
        return;
      }
      const parsedVES = parseFloat(originalAmountVES);
      const parsedRate = parseFloat(bcvRate);
      if (isNaN(parsedVES) || parsedVES <= 0) {
        setFormError("El monto en Bolívares debe ser un número válido mayor que cero.");
        return;
      }
      if (isNaN(parsedRate) || parsedRate <= 0) {
        setFormError("La tasa del BCV debe ser un número válido mayor que cero.");
        return;
      }
      finalAmount = parsedVES / parsedRate;
      originalVESVal = parsedVES;
      bcvRateVal = parsedRate;
    }

    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const finalDate = purchaseDate || todayStr;
    const monthStr = finalDate.substring(0, 7); // YYYY-MM

    const finalProviderName = matchedProvider ? matchedProvider.name : provider.trim();
    const finalProviderRif = matchedProvider?.rif || (providerRifInput.trim() ? providerRifInput.trim() : "N/A");
    const finalProviderAddress = matchedProvider?.address || "N/A";

    const purchaseData = {
      invoiceNumber: invoiceNumber.trim(),
      provider: finalProviderName,
      providerRif: finalProviderRif,
      providerAddress: finalProviderAddress,
      date: finalDate,
      month: monthStr,
      items: [], // Simple or direct invoice loading
      totalAmount: finalAmount,
      type,
      status: type === PurchaseType.Contado ? PurchaseStatus.Pagado : PurchaseStatus.Pendiente,
      paymentDate: type === PurchaseType.Contado ? finalDate : undefined,
      invoiceImage: invoiceImage || undefined,
      currency,
      bcvRate: bcvRateVal,
      originalAmountVES: originalVESVal
    };

    try {
      await onAddPurchase(purchaseData);
      setShowForm(false);
      setInvoiceNumber("");
      setProvider("");
      setTotalAmount("");
      setType(PurchaseType.Contado);
      setPurchaseDate("");
      setCurrency("USD");
      setBcvRate("");
      setOriginalAmountVES("");
      setInvoiceImage(null);
      setInvoiceImageName(null);
    } catch (err: any) {
      setFormError(err.message || "Error al guardar compra.");
    }
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

  const handleParseWithGemini = async () => {
    if (!bulkText && !fileBase64) {
      setParseError("Por favor ingresa un texto o sube un archivo Excel/PDF.");
      return;
    }

    setIsParsing(true);
    setParseError("");
    setParsedPurchases([]);

    try {
      const response = await fetch("/api/parse-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: fileBase64 || undefined,
          mimeType: mimeType || undefined,
          fileText: bulkText || undefined,
          parseType: "provider_invoice"
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
          errMsg = "La IA de Google (Gemini) está experimentando una alta demanda o indisponibilidad temporal en sus servidores. Por favor, espera unos segundos e intenta nuevamente, o ingresa los datos de las compras manualmente.";
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

      if (data.purchases && Array.isArray(data.purchases)) {
        setParsedPurchases(data.purchases);
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
    if (parsedPurchases.length === 0) return;

    const todayStr = new Date().toISOString().split("T")[0];

    const cleanPurchases = parsedPurchases
      .filter((p) => p.invoiceNumber || p.provider)
      .map((p, index) => {
        const invNum = p.invoiceNumber ? String(p.invoiceNumber) : `S/N-${index + 1}`;
        const amount = p.totalAmount ? cleanPriceValue(p.totalAmount) : 0;
        return {
          invoiceNumber: invNum,
          provider: String(p.provider || "Proveedor Desconocido"),
          date: String(p.date || todayStr),
          month: String(p.date ? p.date.substring(0, 7) : todayStr.substring(0, 7)),
          items: [],
          totalAmount: amount,
          type: p.type === "credito" ? PurchaseType.Credito : PurchaseType.Contado,
          status: p.type === "credito" ? PurchaseStatus.Pendiente : PurchaseStatus.Pagado,
          paymentDate: p.type === "credito" ? undefined : (p.date || todayStr)
        };
      });

    await onAddPurchasesBulk(cleanPurchases);
    setParsedPurchases([]);
    setBulkText("");
    setFileBase64(null);
    setFileName(null);
    setShowBulkUpload(false);
  };

  const handleExportPurchasesToExcel = () => {
    const exportData = purchases.map((p) => {
      return {
        "Nº Factura": p.invoiceNumber,
        "Proveedor": p.provider,
        "RIF / Cédula Proveedor": p.providerRif || "N/A",
        "Dirección Proveedor": p.providerAddress || "N/A",
        "Fecha de Compra": p.date,
        "Monto Compra ($)": p.totalAmount,
        "Tipo de Compra": p.type === PurchaseType.Credito ? "Crédito" : "Contado",
        "Estado": p.status === PurchaseStatus.Pagado ? "Pagado" : "Pendiente (Deuda)",
        "Fecha de Pago": p.paymentDate || "Pendiente",
        "Divisa Original": p.currency || "USD",
        "Monto Original (VES)": p.originalAmountVES || "N/A",
        "Tasa de Cambio (BCV)": p.bcvRate || "N/A"
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Compras");

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

    XLSX.writeFile(workbook, "Reporte_Compras_Deudas_SinGlutenpzo.xlsx");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {activeSubTab === "compras" ? "Compras & Deudas" : "Directorio de Proveedores"}
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            {activeSubTab === "compras"
              ? "Administra cuentas por pagar de mercancía y liquida deudas con proveedores"
              : "Controla la base de datos de proveedores antiguos y nuevos para registro de compras"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
          {activeSubTab === "compras" ? (
            <>
              <button
                onClick={handleExportPurchasesToExcel}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-500/20 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span>Exportar Excel</span>
              </button>
              <button
                onClick={() => setShowBulkUpload(true)}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600/10 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-500/20 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
              >
                <UploadCloud className="h-4 w-4" />
                <span>Excel / PDF Automático</span>
              </button>
              <button
                onClick={() => {
                  setFormError("");
                  setShowForm(true);
                }}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-blue-500/25"
              >
                <Plus className="h-4 w-4" />
                <span>Registrar Compra</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleExportProvidersToExcel}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-500/20 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span>Exportar Proveedores</span>
              </button>
              <button
                onClick={() => {
                  setProviderParseError("");
                  setParsedProviders([]);
                  setProviderBulkText("");
                  setProviderFileBase64(null);
                  setProviderFileName(null);
                  setShowProviderBulkUpload(true);
                }}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600/10 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-500/20 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
              >
                <UploadCloud className="h-4 w-4" />
                <span>Carga Masiva IA</span>
              </button>
              <button
                onClick={() => {
                  setProviderError("");
                  setShowProviderForm(true);
                }}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-blue-500/25"
              >
                <Plus className="h-4 w-4" />
                <span>Nuevo Proveedor</span>
              </button>
            </>
          )}

          {/* Sub tabs switcher */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
            <button
              onClick={() => setActiveSubTab("compras")}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeSubTab === "compras"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Compras</span>
            </button>
            <button
              onClick={() => setActiveSubTab("proveedores")}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeSubTab === "proveedores"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Truck className="h-4 w-4" />
              <span>Proveedores</span>
            </button>
          </div>
        </div>
      </div>

      {/* Excel / PDF Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[80] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-3xl p-4 sm:p-6 shadow-2xl space-y-6 max-h-[92vh] my-auto overflow-y-auto border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <UploadCloud className="h-5 w-5 text-blue-600" />
                  <span>Automatizar Carga de Facturas y Pagos con IA</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Sube tu archivo Excel o PDF de facturas de compra para procesar con IA</p>
              </div>
              <button
                onClick={() => {
                  setShowBulkUpload(false);
                  setParsedPurchases([]);
                  setParseError("");
                  setFileName(null);
                  setFileBase64(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {parsedPurchases.length === 0 ? (
              <div className="space-y-4">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      processFile(file);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/20 p-8 rounded-2xl text-center cursor-pointer transition-all space-y-3"
                >
                  <UploadCloud className="h-10 w-10 text-blue-500 mx-auto" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">
                      {fileName ? `Archivo cargado: ${fileName}` : "Sube el Excel o PDF de compras o facturas de proveedores aquí"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Garantiza precisión en la transcripción automática de facturas</p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.xlsx,.xls,.csv,.txt"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">O copia y pega el reporte contable</label>
                  <textarea
                    rows={4}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="Ejemplo:&#10;Factura 4022 Proveedor Oriven Distribuidora, Monto total 1500$, crédito&#10;Factura 3051 Proveedor Mayorista Harinas, Monto total 450$, contado"
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
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 uppercase"
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
                        <span>Leyendo con IA...</span>
                      </>
                    ) : (
                      <span>Cargar Facturas</span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Review parsed purchases */
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-700">Revisa las compras extraídas de tu Excel</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto max-h-[40vh]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                        <th className="p-3">Factura #</th>
                        <th className="p-3">Proveedor</th>
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Monto Total</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-slate-100">
                      {parsedPurchases.map((p, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="p-3">
                            <input
                              type="text"
                              value={p.invoiceNumber}
                              onChange={(e) => {
                                const copy = [...parsedPurchases];
                                copy[index].invoiceNumber = e.target.value;
                                setParsedPurchases(copy);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:bg-white"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={p.provider}
                              onChange={(e) => {
                                const copy = [...parsedPurchases];
                                copy[index].provider = e.target.value;
                                setParsedPurchases(copy);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:bg-white"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={p.date}
                              onChange={(e) => {
                                const copy = [...parsedPurchases];
                                copy[index].date = e.target.value;
                                setParsedPurchases(copy);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:bg-white"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={p.totalAmount}
                              onChange={(e) => {
                                const copy = [...parsedPurchases];
                                copy[index].totalAmount = Number(e.target.value);
                                setParsedPurchases(copy);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:bg-white"
                            />
                          </td>
                          <td className="p-3">
                            <select
                              value={p.type}
                              onChange={(e) => {
                                const copy = [...parsedPurchases];
                                copy[index].type = e.target.value;
                                setParsedPurchases(copy);
                              }}
                              className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-600"
                            >
                              <option value="contado">Contado</option>
                              <option value="credito">Crédito</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => {
                                setParsedPurchases(parsedPurchases.filter((_, idx) => idx !== index));
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
                  <p className="text-xs text-slate-400">Total detectado: {parsedPurchases.length} compras.</p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setParsedPurchases([])}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 uppercase"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleConfirmBulkAdd}
                      className="flex items-center space-x-1.5 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md"
                    >
                      <Check className="h-4 w-4" />
                      <span>Confirmar e Importar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Add Purchase Form Modal */}
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
              <FileText className="h-5 w-5 text-blue-600" />
              <span>Registrar Factura de Compra</span>
            </h3>

            <form onSubmit={handleCreatePurchase} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Número de Factura</label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Ej: FAC-98231"
                  className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                />
              </div>

              {/* Provider Auto-Recognition Banner */}
              {matchedProvider && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-2 text-emerald-900 text-xs shadow-sm animate-fade-in">
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <div className="truncate">
                      <span className="font-bold">✓ Proveedor Registrado:</span>{" "}
                      <span className="font-extrabold text-emerald-800">{matchedProvider.name}</span>{" "}
                      <span className="text-emerald-700 font-mono text-[11px]">({matchedProvider.rif || "Sin RIF"})</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyProviderData(matchedProvider)}
                    className="flex-shrink-0 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition-all shadow-sm flex items-center space-x-1"
                  >
                    <span>Cargar Datos</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nombre del Proveedor</label>
                  <input
                    type="text"
                    required
                    list="provider-suggestions"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder="Ej: Distribuidora Lion King"
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                  />
                  <datalist id="provider-suggestions">
                    {providers.map((p) => (
                      <option key={p.id} value={p.name}>{`${p.name} (${p.rif || 'Sin RIF'})`}</option>
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">RIF / Cédula del Proveedor</label>
                  <input
                    type="text"
                    value={providerRifInput}
                    onChange={(e) => setProviderRifInput(e.target.value)}
                    placeholder="Ej: J-12345678-9"
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Moneda de la Factura</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrency("USD")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      currency === "USD"
                        ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Dólares ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency("VES")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      currency === "VES"
                        ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Bolívares (Bs.)
                  </button>
                </div>
              </div>

              {currency === "USD" ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Monto Total de Compra ($)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="Ej: 1450"
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Monto en Bs.</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="any"
                        value={originalAmountVES}
                        onChange={(e) => setOriginalAmountVES(e.target.value)}
                        placeholder="Ej: 4500"
                        className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Tasa BCV (Bs./$)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="any"
                        value={bcvRate}
                        onChange={(e) => setBcvRate(e.target.value)}
                        placeholder="Ej: 45.0"
                        className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                      />
                    </div>
                  </div>

                  {originalAmountVES && bcvRate && !isNaN(parseFloat(originalAmountVES) / parseFloat(bcvRate)) && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex justify-between items-center text-xs font-bold text-slate-900">
                      <span>Equivalente en Dólares:</span>
                      <span className="text-sm font-black">
                        ${(parseFloat(originalAmountVES) / parseFloat(bcvRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Invoice Photo Uploader */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center space-x-1">
                  <UploadCloud className="h-4 w-4 text-blue-500" />
                  <span>Foto de la Factura (Opcional)</span>
                </label>
                
                {invoiceImage ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <img
                        src={invoiceImage}
                        alt="Factura"
                        className="h-12 w-12 object-cover rounded-lg border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-700 truncate max-w-[180px]">
                          {invoiceImageName || "Factura cargada"}
                        </p>
                        <p className="text-[10px] text-slate-400">Imagen de factura lista</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceImage(null);
                        setInvoiceImageName(null);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => invoicePhotoInputRef.current?.click()}
                    className="border border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/10 p-4 rounded-2xl text-center cursor-pointer transition-all space-y-1"
                  >
                    <UploadCloud className="h-6 w-6 text-blue-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">Haz clic para cargar foto de factura</p>
                    <p className="text-[10px] text-slate-400">Soporta JPG, PNG o WEBP</p>
                    <input
                      type="file"
                      ref={invoicePhotoInputRef}
                      onChange={handleInvoicePhotoChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Modalidad de Compra</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setType(PurchaseType.Contado)}
                    className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all flex flex-col items-center justify-center space-y-1 ${
                      type === PurchaseType.Contado
                        ? "bg-blue-50 border-blue-500 text-blue-700 shadow"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <DollarSign className="h-4 w-4" />
                    <span>Contado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType(PurchaseType.Credito)}
                    className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all flex flex-col items-center justify-center space-y-1 ${
                      type === PurchaseType.Credito
                        ? "bg-blue-50 border-blue-500 text-blue-700 shadow"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>A Crédito (Deuda)</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Fecha de Factura</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
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
                  Guardar Factura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Purchases Grid Board */}
      {activeSubTab === "compras" && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar factura o proveedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-bold transition-all outline-none"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                statusFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter("pagado")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                statusFilter === "pagado"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Liquidados
            </button>
            <button
              onClick={() => setStatusFilter("pendiente")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                statusFilter === "pendiente"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Pendientes (Deuda)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 bg-slate-50/50">
                <th className="p-4">Factura #</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Proveedor</th>
                <th className="p-4">Monto total</th>
                <th className="p-4">Modalidad</th>
                <th className="p-4">Estado Pago</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredPurchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-extrabold text-slate-800">
                    <div className="flex items-center space-x-2">
                      <span>{p.invoiceNumber}</span>
                      {p.invoiceImage && (
                        <button
                          onClick={() => setSelectedInvoicePhoto(p.invoiceImage!)}
                          className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all"
                          title="Ver Foto de Factura"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="flex items-center space-x-1 text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{p.date}</span>
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-800">
                    {p.provider}
                  </td>
                  <td className="p-4">
                    <div className="font-black text-rose-600">
                      -${p.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {p.currency === "VES" && p.originalAmountVES && p.bcvRate && (
                      <div className="text-[10px] font-bold text-slate-400 mt-0.5 whitespace-nowrap">
                        {p.originalAmountVES.toLocaleString(undefined, { minimumFractionDigits: 2 })} Bs.
                        <span className="font-medium text-slate-400"> (Tasa: {p.bcvRate})</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      p.type === PurchaseType.Contado
                        ? "bg-slate-100 border-slate-200 text-slate-700"
                        : "bg-blue-50 border-blue-100 text-blue-700"
                    }`}>
                      {p.type === PurchaseType.Contado ? <DollarSign className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                      <span>{p.type}</span>
                    </span>
                  </td>
                  <td className="p-4">
                    {p.status === PurchaseStatus.Pagado ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] uppercase font-bold tracking-wider">
                        <Check className="h-3 w-3" />
                        <span>Liquidado</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 text-[10px] uppercase font-bold tracking-wider">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Pendiente</span>
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {p.status === PurchaseStatus.Pendiente && (
                        <button
                          onClick={() => {
                            askConfirmation(
                              "Liquidar Deuda",
                              `¿Liquidar de la Ganancia Líquida la deuda de $${p.totalAmount} para la factura ${p.invoiceNumber}?`,
                              () => {
                                onPayPurchase(p.id);
                              },
                              { type: "blue" }
                            );
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors flex items-center space-x-1 shadow"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Pagar</span>
                        </button>
                      )}
                      {onEditPurchase && (
                        <button
                          onClick={() => handleOpenEditPurchase(p)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modificar Compra"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          askConfirmation(
                            "Eliminar Compra",
                            `¿Seguro que deseas eliminar el registro de esta factura?`,
                            () => {
                              onDeletePurchase(p.id);
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
              ))}

              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                    No se encontraron facturas o compras registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Main Providers Grid Board */}
      {activeSubTab === "proveedores" && (() => {
        const filteredProviders = providers.filter(p =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.rif && p.rif.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        const areAllSelected = filteredProviders.length > 0 && filteredProviders.every(p => selectedProviderIds.includes(p.id));

        return (
          <div className="space-y-4">
            {selectedProviderIds.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-sm">
                    {selectedProviderIds.length}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">Proveedores seleccionados</p>
                    <p className="text-xs text-slate-500 font-medium">Puedes realizar acciones masivas sobre los proveedores seleccionados</p>
                  </div>
                </div>
                <div className="flex space-x-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleOpenProviderBulkEditModal}
                    className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Modificar Selección</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelectedProviders}
                    className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Eliminar Selección</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProviderIds([])}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 uppercase"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar proveedor por nombre, RIF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-bold transition-all outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                      <th className="p-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={areAllSelected}
                          onChange={() => handleToggleAllProviders(filteredProviders)}
                          className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                        />
                      </th>
                      <th className="p-4">Nombre del Proveedor</th>
                      <th className="p-4">RIF / Cédula</th>
                      <th className="p-4">Contacto</th>
                      <th className="p-4">Dirección</th>
                      <th className="p-4">Notas</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100">
                    {filteredProviders.map((p) => {
                      const isSelected = selectedProviderIds.includes(p.id);
                      return (
                        <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors ${isSelected ? "bg-blue-50/30" : ""}`}>
                          <td className="p-4 text-center w-12" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleProviderSelection(p.id)}
                              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-4 font-bold text-slate-900">{p.name}</td>
                          <td className="p-4 font-mono font-medium text-slate-500">{p.rif || "N/A"}</td>
                          <td className="p-4 space-y-0.5">
                            <div className="font-semibold text-slate-800">{p.phone || "Sin teléfono"}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{p.email || "Sin correo"}</div>
                          </td>
                          <td className="p-4 text-slate-600 max-w-[200px] truncate">{p.address || "N/A"}</td>
                          <td className="p-4 text-slate-400 max-w-[150px] truncate">{p.notes || "Sin notas"}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setEditingProvider(p);
                                  setEditProviderName(p.name);
                                  setEditProviderPhone(p.phone || "");
                                  setEditProviderEmail(p.email || "");
                                  setEditProviderAddress(p.address || "");
                                  setEditProviderRif(p.rif || "");
                                  setEditProviderNotes(p.notes || "");
                                }}
                                className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-xl transition-all"
                                title="Editar Proveedor"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              {onDeleteProvider && (
                                <button
                                  onClick={() => {
                                    askConfirmation(
                                      "Eliminar Proveedor",
                                      `¿Estás seguro de eliminar al proveedor "${p.name}"?`,
                                      () => {
                                        onDeleteProvider(p.id);
                                      }
                                    );
                                  }}
                                  className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-all"
                                  title="Eliminar Proveedor"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProviders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                          No hay proveedores registrados aún o no coinciden con la búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* View Invoice Photo Modal */}
      {selectedInvoicePhoto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative border border-slate-100 space-y-4">
            <button
              onClick={() => setSelectedInvoicePhoto(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Eye className="h-5 w-5 text-blue-600" />
              <span>Foto de la Factura de Compra</span>
            </h3>
            <div className="rounded-2xl overflow-hidden border border-slate-100 max-h-[60vh] bg-slate-50 flex items-center justify-center p-2">
              <img
                src={selectedInvoicePhoto}
                alt="Factura de Compra Completa"
                className="max-h-[55vh] max-w-full object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex justify-end">
              <a
                href={selectedInvoicePhoto}
                download={`factura_${Date.now()}.png`}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md"
              >
                Descargar Imagen
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Edit Purchase Modal */}
      {editingPurchase && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[90] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative border border-slate-100 space-y-6 my-auto max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setEditingPurchase(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Edit className="h-5 w-5 text-blue-600" />
                <span>Modificar Factura de Compra</span>
              </h3>
              <p className="text-xs text-slate-500">
                Edita los detalles registrados de la factura o compra.
              </p>
            </div>

            <form onSubmit={handleEditPurchaseSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Número de Factura</label>
                <input
                  type="text"
                  required
                  value={editInvoiceNumber}
                  onChange={(e) => setEditInvoiceNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Proveedor / Provider</label>
                <input
                  type="text"
                  required
                  value={editProvider}
                  onChange={(e) => setEditProvider(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Condición</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as PurchaseType)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                  >
                    <option value={PurchaseType.Contado}>Contado</option>
                    <option value={PurchaseType.Credito}>Crédito</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Estado</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as PurchaseStatus)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                  >
                    <option value={PurchaseStatus.Pagado}>Liquidado</option>
                    <option value={PurchaseStatus.Pendiente}>Pendiente</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Moneda de Compra</label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 text-sm font-semibold">
                    <input
                      type="radio"
                      name="editCurrency"
                      checked={editCurrency === "USD"}
                      onChange={() => setEditCurrency("USD")}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Dólares (USD)</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm font-semibold">
                    <input
                      type="radio"
                      name="editCurrency"
                      checked={editCurrency === "VES"}
                      onChange={() => setEditCurrency("VES")}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Bolívares (VES)</span>
                  </label>
                </div>
              </div>

              {editCurrency === "USD" ? (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-bold text-slate-500 uppercase">Monto Total ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editTotalAmount}
                    onChange={(e) => setEditTotalAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Monto en VES</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={editOriginalAmountVES}
                      onChange={(e) => setEditOriginalAmountVES(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Tasa BCV</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={editBcvRate}
                      onChange={(e) => setEditBcvRate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Fecha de Registro</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                />
              </div>

              {editFormError && (
                <div className="flex items-center space-x-2 bg-rose-50 border border-rose-100 text-rose-600 text-xs p-3 rounded-xl">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{editFormError}</span>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPurchase(null)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW PROVIDER MODAL */}
      {showProviderForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[80] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg p-4 sm:p-6 shadow-2xl relative border border-slate-100 space-y-6 animate-fade-in my-auto max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowProviderForm(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Truck className="h-5 w-5 text-blue-600" />
                <span>Registrar Nuevo Proveedor</span>
              </h3>
              <p className="text-xs text-slate-500">
                Registra un proveedor de mercancías para asociarlo a tus futuras facturas y compras.
              </p>
            </div>

            <form onSubmit={handleCreateProviderSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nombre del Proveedor / Empresa *</label>
                  <input
                    type="text"
                    required
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder="Ej: Distribuidora Lion King C.A."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">RIF / Cédula</label>
                  <input
                    type="text"
                    value={providerRif}
                    onChange={(e) => setProviderRif(e.target.value)}
                    placeholder="Ej: J-12345678-9"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={providerPhone}
                    onChange={(e) => setProviderPhone(e.target.value)}
                    placeholder="Ej: +584120000000"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Correo Electrónico</label>
                  <input
                    type="email"
                    value={providerEmail}
                    onChange={(e) => setProviderEmail(e.target.value)}
                    placeholder="Ej: ventas@proveedor.com"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Dirección Física</label>
                  <input
                    type="text"
                    value={providerAddress}
                    onChange={(e) => setProviderAddress(e.target.value)}
                    placeholder="Ej: Calle Principal, Galpón 4"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Notas / Observaciones</label>
                  <textarea
                    rows={2}
                    value={providerNotes}
                    onChange={(e) => setProviderNotes(e.target.value)}
                    placeholder="Ej: Ofrece crédito a 15 días, despacha los martes."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none resize-none"
                  />
                </div>
              </div>

              {providerError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                  {providerError}
                </p>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProviderForm(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProvider}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md"
                >
                  {isSubmittingProvider ? "Registrando..." : "Registrar Proveedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROVIDER MODAL */}
      {editingProvider && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[80] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl relative border border-slate-100 space-y-6 animate-fade-in my-8">
            <button
              onClick={() => setEditingProvider(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Edit className="h-5 w-5 text-blue-600" />
                <span>Modificar Proveedor</span>
              </h3>
              <p className="text-xs text-slate-500">
                Modifica los datos del proveedor seleccionado.
              </p>
            </div>

            <form onSubmit={handleEditProviderSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nombre del Proveedor / Empresa *</label>
                  <input
                    type="text"
                    required
                    value={editProviderName}
                    onChange={(e) => setEditProviderName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">RIF / Cédula</label>
                  <input
                    type="text"
                    value={editProviderRif}
                    onChange={(e) => setEditProviderRif(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={editProviderPhone}
                    onChange={(e) => setEditProviderPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Correo Electrónico</label>
                  <input
                    type="email"
                    value={editProviderEmail}
                    onChange={(e) => setEditProviderEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Dirección Física</label>
                  <input
                    type="text"
                    value={editProviderAddress}
                    onChange={(e) => setEditProviderAddress(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Notas / Observaciones</label>
                  <textarea
                    rows={2}
                    value={editProviderNotes}
                    onChange={(e) => setEditProviderNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProvider(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK UPLOAD PROVIDERS WITH GEMINI IA MODAL */}
      {showProviderBulkUpload && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[80] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl p-6 shadow-2xl relative border border-slate-100 space-y-6 animate-fade-in my-8 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowProviderBulkUpload(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1.5 flex-shrink-0">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Truck className="h-5 w-5 text-blue-600" />
                <span>Carga Inteligente de Proveedores con IA (Excel, PDF o Imagen)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Sube una lista de tus proveedores, distribuidores o mayoristas desde archivos de Excel (.xlsx, .xls), CSV, documentos PDF o capturas de pantalla de tus contactos de proveedores. Nuestra IA los extraerá y organizará automáticamente.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-4">
              {parsedProviders.length === 0 ? (
                <div className="space-y-4">
                  {/* File Dropzone */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        processProviderFile(file);
                      }
                    }}
                    onClick={() => providerFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-3"
                  >
                    <input
                      type="file"
                      ref={providerFileInputRef}
                      onChange={handleProviderFileChange}
                      accept=".xlsx,.xls,.csv,.pdf,image/*"
                      className="hidden"
                    />
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                      <Download className="h-6 w-6 transform rotate-180" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {providerFileName ? `Archivo seleccionado: ${providerFileName}` : "Arrastra tu archivo aquí o haz clic para buscar"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Soporta Excel, CSV, PDF o imágenes de listas de proveedores
                      </p>
                    </div>
                  </div>

                  {/* Manual Paste area */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase flex justify-between items-center">
                      <span>O copia y pega el texto de la lista aquí</span>
                      {providerBulkText && <span className="text-[10px] text-emerald-600">✓ Datos listos</span>}
                    </label>
                    <textarea
                      rows={5}
                      value={providerBulkText}
                      onChange={(e) => {
                        setProviderBulkText(e.target.value);
                        setProviderFileBase64(null);
                        setProviderFileName(null);
                      }}
                      placeholder="Ej:&#10;Distribuidora BioAlimentos, RIF J-12345678-9, Telf 04121234567, Vende harinas sin gluten y frutos secos&#10;Mayorista Oriven, Telf 04147654321, email: contacto@singlutenpzo.com"
                      className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span>SE HAN DETECTADO {parsedProviders.length} PROVEEDORES</span>
                    <button
                      onClick={() => {
                        const allChecked = selectedParsedProviders.every(v => v);
                        setSelectedParsedProviders(new Array(parsedProviders.length).fill(!allChecked));
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {selectedParsedProviders.every(v => v) ? "Deseleccionar todos" : "Seleccionar todos"}
                    </button>
                  </div>

                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <tr>
                          <th className="p-3 w-10"></th>
                          <th className="p-3">Nombre / Empresa</th>
                          <th className="p-3">RIF / Cédula</th>
                          <th className="p-3">Teléfono</th>
                          <th className="p-3">Correo</th>
                          <th className="p-3">Dirección</th>
                          <th className="p-3">Notas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedProviders.map((prov, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={selectedParsedProviders[idx] || false}
                                onChange={(e) => {
                                  const updated = [...selectedParsedProviders];
                                  updated[idx] = e.target.checked;
                                  setSelectedParsedProviders(updated);
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={prov.name || ""}
                                onChange={(e) => {
                                  const updated = [...parsedProviders];
                                  updated[idx].name = e.target.value;
                                  setParsedProviders(updated);
                                }}
                                className="w-full bg-transparent border-b border-transparent focus:border-blue-300 outline-none font-bold text-slate-800"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={prov.rif || ""}
                                onChange={(e) => {
                                  const updated = [...parsedProviders];
                                  updated[idx].rif = e.target.value;
                                  setParsedProviders(updated);
                                }}
                                className="w-full bg-transparent border-b border-transparent focus:border-blue-300 outline-none text-slate-600 font-mono"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={prov.phone || ""}
                                onChange={(e) => {
                                  const updated = [...parsedProviders];
                                  updated[idx].phone = e.target.value;
                                  setParsedProviders(updated);
                                }}
                                className="w-full bg-transparent border-b border-transparent focus:border-blue-300 outline-none text-slate-600"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={prov.email || ""}
                                onChange={(e) => {
                                  const updated = [...parsedProviders];
                                  updated[idx].email = e.target.value;
                                  setParsedProviders(updated);
                                }}
                                className="w-full bg-transparent border-b border-transparent focus:border-blue-300 outline-none text-slate-600"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={prov.address || ""}
                                onChange={(e) => {
                                  const updated = [...parsedProviders];
                                  updated[idx].address = e.target.value;
                                  setParsedProviders(updated);
                                }}
                                className="w-full bg-transparent border-b border-transparent focus:border-blue-300 outline-none text-slate-600"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={prov.notes || ""}
                                onChange={(e) => {
                                  const updated = [...parsedProviders];
                                  updated[idx].notes = e.target.value;
                                  setParsedProviders(updated);
                                }}
                                className="w-full bg-transparent border-b border-transparent focus:border-blue-300 outline-none text-slate-600 italic"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {providerParseError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 animate-fade-in">
                  {providerParseError}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100 flex-shrink-0">
              {parsedProviders.length > 0 ? (
                <button
                  onClick={() => setParsedProviders([])}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 uppercase"
                >
                  Volver a cargar
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Powered by Gemini AI Studio ⚡</span>
              )}

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowProviderBulkUpload(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 uppercase"
                >
                  Cancelar
                </button>

                {parsedProviders.length === 0 ? (
                  <button
                    onClick={handleParseProvidersWithGemini}
                    disabled={isParsingProviders || (!providerBulkText && !providerFileBase64)}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md flex items-center space-x-2"
                  >
                    {isParsingProviders ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Analizando con la IA...</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4" />
                        <span>Procesar con IA</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleConfirmImportProviders}
                    disabled={isImportingProviders || !selectedParsedProviders.some(v => v)}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-300 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md flex items-center space-x-2"
                  >
                    {isImportingProviders ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Importando proveedores...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Importar Seleccionados ({selectedParsedProviders.filter(v => v).length})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK EDIT PROVIDERS MODAL */}
      {showProviderBulkEditModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[80] flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-5xl p-6 shadow-2xl relative border border-slate-100 space-y-6 my-8 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowProviderBulkEditModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1.5 flex-shrink-0">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Truck className="h-5 w-5 text-blue-600" />
                <span>Modificación Masiva de Proveedores</span>
              </h3>
              <p className="text-xs text-slate-500">
                Estás editando {bulkEditProviders.length} proveedores simultáneamente. Modifica sus datos en la siguiente tabla y presiona "Guardar Cambios Masivos" para actualizar todos sus registros de forma automática.
              </p>
            </div>

            {/* Quick action helper inside modal */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 flex-shrink-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Acción Rápida: Aplicar el mismo valor a todos los seleccionados</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="quickProvAddress"
                    placeholder="Escribir dirección para todos..."
                    className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = (document.getElementById("quickProvAddress") as HTMLInputElement)?.value || "";
                      if (!val) return;
                      setBulkEditProviders(prev => prev.map(p => ({ ...p, address: val })));
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[10px] uppercase rounded-lg"
                  >
                    Aplicar
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="quickProvNotes"
                    placeholder="Escribir notas para todos..."
                    className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = (document.getElementById("quickProvNotes") as HTMLInputElement)?.value || "";
                      if (!val) return;
                      setBulkEditProviders(prev => prev.map(p => ({ ...p, notes: val })));
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[10px] uppercase rounded-lg"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 pr-1">
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                    <tr>
                      <th className="p-3">Nombre del Proveedor</th>
                      <th className="p-3">RIF / Cédula</th>
                      <th className="p-3">Teléfono</th>
                      <th className="p-3">Correo</th>
                      <th className="p-3">Dirección</th>
                      <th className="p-3">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bulkEditProviders.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2">
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => {
                              const updated = [...bulkEditProviders];
                              updated[idx].name = e.target.value;
                              setBulkEditProviders(updated);
                            }}
                            className="w-full p-1.5 bg-slate-50 border border-transparent focus:border-blue-300 focus:bg-white rounded outline-none font-bold text-slate-800"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={p.rif}
                            onChange={(e) => {
                              const updated = [...bulkEditProviders];
                              updated[idx].rif = e.target.value;
                              setBulkEditProviders(updated);
                            }}
                            className="w-full p-1.5 bg-slate-50 border border-transparent focus:border-blue-300 focus:bg-white rounded outline-none font-mono text-slate-600"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={p.phone}
                            onChange={(e) => {
                              const updated = [...bulkEditProviders];
                              updated[idx].phone = e.target.value;
                              setBulkEditProviders(updated);
                            }}
                            className="w-full p-1.5 bg-slate-50 border border-transparent focus:border-blue-300 focus:bg-white rounded outline-none text-slate-600"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={p.email}
                            onChange={(e) => {
                              const updated = [...bulkEditProviders];
                              updated[idx].email = e.target.value;
                              setBulkEditProviders(updated);
                            }}
                            className="w-full p-1.5 bg-slate-50 border border-transparent focus:border-blue-300 focus:bg-white rounded outline-none text-slate-600"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={p.address}
                            onChange={(e) => {
                              const updated = [...bulkEditProviders];
                              updated[idx].address = e.target.value;
                              setBulkEditProviders(updated);
                            }}
                            className="w-full p-1.5 bg-slate-50 border border-transparent focus:border-blue-300 focus:bg-white rounded outline-none text-slate-600"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={p.notes}
                            onChange={(e) => {
                              const updated = [...bulkEditProviders];
                              updated[idx].notes = e.target.value;
                              setBulkEditProviders(updated);
                            }}
                            className="w-full p-1.5 bg-slate-50 border border-transparent focus:border-blue-300 focus:bg-white rounded outline-none text-slate-600 italic"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowProviderBulkEditModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveProviderBulkEdit}
                disabled={isSavingProviderBulkEdit}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md flex items-center space-x-2"
              >
                {isSavingProviderBulkEdit ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Guardando cambios...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Guardar Cambios Masivos</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-rose-200"
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
