import React, { useState, useRef } from "react";
import { Product, Sale, ProductCategory } from "../types";
import {
  Users, Calendar, Clock, Search, User, Phone, MapPin, CreditCard,
  MessageSquare, ArrowRight, X, CheckCircle, AlertCircle, AlertTriangle, DollarSign,
  FileText, TrendingUp, CalendarDays, Bell, Edit, Trash2, Mail,
  ChevronLeft, ChevronRight, Download, Plus, Heart, Sparkles, Camera, Eye
} from "lucide-react";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import logoImg from "../assets/images/singlutenpzo_logo_1785767632220.jpg";
import { downloadReceiptImage, shareReceiptImage } from "../utils/receiptCanvas";

interface ClientesManagerProps {
  sales: Sale[];
  onUpdateSaleDebt?: (saleId: string, paidIncrement: number, paymentMethod: string, paymentDate?: string) => Promise<void>;
  onUpdateClient?: (
    oldCedula: string,
    oldName: string,
    newDetails: { name: string; phone: string; cedula: string; address: string; email: string }
  ) => Promise<void>;
  onDeleteClient?: (oldCedula: string, oldName: string) => Promise<void>;
  onRegisterSale?: (sale: Omit<Sale, "id" | "createdAt">) => Promise<string>;
}

interface CustomerGroup {
  name: string;
  cedula: string;
  phone: string;
  address: string;
  email: string;
  totalPurchases: number;
  outstandingDebt: number;
  sales: Sale[];
}

interface CollectionItem {
  id: string; // Sale ID
  customerName: string;
  customerPhone: string;
  customerCedula: string;
  customerAddress: string;
  productName: string;
  remainingAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
  dueDateObj: Date;
  periodicity: string;
  status: "vencido" | "hoy" | "pendiente";
  sale: Sale;
}

export default function ClientesManager({
  sales,
  onUpdateSaleDebt,
  onUpdateClient,
  onDeleteClient,
  onRegisterSale
}: ClientesManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [subTab, setSubTab] = useState<"directorio" | "calendario">("directorio");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerGroup | null>(null);

  // Register Old Client Modal States
  const [showOldClientModal, setShowOldClientModal] = useState(false);
  const [oldClientName, setOldClientName] = useState("");
  const [oldClientCedulaPrefix, setOldClientCedulaPrefix] = useState("V");
  const [oldClientCedulaNumber, setOldClientCedulaNumber] = useState("");
  const [oldClientPhone, setOldClientPhone] = useState("");
  const [oldClientAddress, setOldClientAddress] = useState("");
  const [oldClientEmail, setOldClientEmail] = useState("");
  const [oldClientInitialDebt, setOldClientInitialDebt] = useState("");
  const [oldClientDebtDetails, setOldClientDebtDetails] = useState("");
  const [oldClientPaymentPeriodicity, setOldClientPaymentPeriodicity] = useState("semanal");
  const [oldClientSpecificPaymentDate, setOldClientSpecificPaymentDate] = useState("");
  const [oldClientInstallmentsCount, setOldClientInstallmentsCount] = useState("1");
  const [oldClientFormError, setOldClientFormError] = useState("");
  const [isSubmittingOldClient, setIsSubmittingOldClient] = useState(false);

  // Edit Customer States
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCedula, setEditCedula] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Calendar filter state
  const [calendarFilter, setCalendarFilter] = useState<"todos" | "vencidos" | "hoy" | "semana">("todos");

  // Month-by-month calendar states
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Local abono modal states
  const [selectedAbonoSale, setSelectedAbonoSale] = useState<Sale | null>(null);
  const [abonoAmount, setAbonoAmount] = useState("");
  const [abonoPaymentMethod, setAbonoPaymentMethod] = useState("Efectivo");
  const [abonoDate, setAbonoDate] = useState("");
  const [abonoError, setAbonoError] = useState("");
  const [isSubmittingAbono, setIsSubmittingAbono] = useState(false);

  // Receipt Modal and Image Generation states
  const receiptRef = useRef<HTMLDivElement>(null);
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<Sale | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // States for bulk client operations
  const [selectedCustomerCedulas, setSelectedCustomerCedulas] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditCustomers, setBulkEditCustomers] = useState<{
    cedula: string;
    originalName: string;
    name: string;
    phone: string;
    address: string;
    email: string;
  }[]>([]);
  const [isSavingBulkEdit, setIsSavingBulkEdit] = useState(false);

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

  const handleToggleCustomerSelection = (cedula: string) => {
    setSelectedCustomerCedulas(prev =>
      prev.includes(cedula)
        ? prev.filter(c => c !== cedula)
        : [...prev, cedula]
    );
  };

  const handleToggleAllCustomers = () => {
    const filteredCedulas = filteredCustomers.map(c => c.cedula);
    const areAllSelected = filteredCedulas.length > 0 && filteredCedulas.every(cedula => selectedCustomerCedulas.includes(cedula));
    
    if (areAllSelected) {
      setSelectedCustomerCedulas(prev => prev.filter(cedula => !filteredCedulas.includes(cedula)));
    } else {
      setSelectedCustomerCedulas(prev => {
        const union = new Set([...prev, ...filteredCedulas]);
        return Array.from(union);
      });
    }
  };

  const handleDeleteSelectedCustomers = () => {
    if (!onDeleteClient) return;
    const count = selectedCustomerCedulas.length;
    askConfirmation(
      "Confirmar Eliminación Masiva",
      `¿Estás completamente seguro de que deseas eliminar a los ${count} clientes seleccionados?\n\n¡ADVERTENCIA: Esta acción es irreversible y anonimizará todas sus facturas en el sistema!`,
      async () => {
        try {
          const customersToDelete = customers.filter(c => selectedCustomerCedulas.includes(c.cedula));
          for (const c of customersToDelete) {
            await onDeleteClient(c.cedula, c.name);
          }
          setSelectedCustomerCedulas([]);
          alert(`${count} clientes eliminados con éxito.`);
        } catch (err) {
          console.error(err);
          alert("Ocurrió un error al intentar eliminar algunos de los clientes.");
        }
      }
    );
  };

  const handleOpenBulkEditModal = () => {
    const clientsToEdit = customers
      .filter(c => selectedCustomerCedulas.includes(c.cedula))
      .map(c => ({
        cedula: c.cedula,
        originalName: c.name,
        name: c.name,
        phone: c.phone,
        address: c.address,
        email: c.email || "",
      }));
    setBulkEditCustomers(clientsToEdit);
    setShowBulkEditModal(true);
  };

  const handleSaveBulkEdit = async () => {
    if (!onUpdateClient) return;
    setIsSavingBulkEdit(true);
    try {
      for (const item of bulkEditCustomers) {
        await onUpdateClient(item.cedula, item.originalName, {
          name: item.name.trim(),
          phone: item.phone.trim(),
          cedula: item.cedula.trim(),
          address: item.address.trim(),
          email: item.email.trim(),
        });
      }
      setShowBulkEditModal(false);
      setSelectedCustomerCedulas([]);
      alert("Clientes actualizados con éxito de forma masiva.");
    } catch (err: any) {
      console.error(err);
      alert("Error al actualizar clientes masivamente: " + (err.message || err));
    } finally {
      setIsSavingBulkEdit(false);
    }
  };

  // Bulk upload states
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parseError, setParseError] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [parsedClients, setParsedClients] = useState<any[]>([]);
  const [selectedParsedClients, setSelectedParsedClients] = useState<boolean[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
          setFileBase64(null);
        } catch (err) {
          console.error("Error parsing Excel:", err);
          setParseError("No se pudo leer el archivo Excel/CSV localmente.");
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
        setBulkText("");
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
    setParsedClients([]);

    try {
      const response = await fetch("/api/parse-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: fileBase64 || undefined,
          mimeType: mimeType || undefined,
          fileText: bulkText || undefined,
          parseType: "clients_or_debts"
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

      if (data.clients && Array.isArray(data.clients)) {
        setParsedClients(data.clients);
        setSelectedParsedClients(new Array(data.clients.length).fill(true));
      } else {
        throw new Error("La IA no devolvió un formato válido de clientes.");
      }
    } catch (err: any) {
      setParseError(err.message || "Error al conectar con el servidor.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (parsedClients.length === 0 || isImporting || !onRegisterSale) return;

    setIsImporting(true);
    setParseError("");

    try {
      let importedCount = 0;
      const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const monthStr = todayStr.substring(0, 7); // YYYY-MM

      for (let i = 0; i < parsedClients.length; i++) {
        if (!selectedParsedClients[i]) continue;

        const client = parsedClients[i];
        if (!client.name || !client.name.trim()) continue;

        const debt = typeof client.debt === "number" ? client.debt : parseFloat(client.debt) || 0;

        const saleData = {
          productId: "",
          productName: client.debtDetails?.trim() || "Deuda / Saldo Pendiente Importado IA",
          category: ProductCategory.Equipos,
          quantity: 1,
          salePrice: debt,
          costPrice: 0,
          profit: 0,
          customerName: client.name.trim(),
          customerPhone: client.phone || "N/A",
          customerCedula: client.cedula || "N/A",
          customerAddress: client.address || "N/A",
          customerEmail: client.email || "",
          paymentPeriodicity: debt > 0 ? "semanal" : undefined,
          installmentsCount: 1,
          date: todayStr,
          month: monthStr,
          paymentMethod: debt > 0 ? "Crédito" : "Efectivo",
          paidAmount: debt > 0 ? 0 : 0,
          remainingAmount: debt,
          status: debt > 0 ? ("pendiente" as const) : ("pagado" as const),
          abonos: []
        };

        await onRegisterSale(saleData);
        importedCount++;
      }

      setShowBulkUpload(false);
      setParsedClients([]);
      setBulkText("");
      setFileBase64(null);
      setFileName("");
      alert(`¡Se importaron exitosamente ${importedCount} clientes y deudas con la IA!`);
    } catch (err: any) {
      setParseError(err.message || "Error al importar clientes.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleRegisterOldClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOldClientFormError("");

    if (!oldClientName.trim()) {
      setOldClientFormError("El nombre es requerido.");
      return;
    }

    const debt = parseFloat(oldClientInitialDebt);
    if (isNaN(debt) || debt <= 0) {
      setOldClientFormError("La deuda inicial debe ser un número válido mayor a cero.");
      return;
    }

    if (!onRegisterSale) {
      setOldClientFormError("La función de registro de ventas no está disponible.");
      return;
    }

    setIsSubmittingOldClient(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const monthStr = todayStr.substring(0, 7); // YYYY-MM

      const cedulaString = oldClientCedulaNumber.trim() 
        ? `${oldClientCedulaPrefix}-${oldClientCedulaNumber.trim()}`
        : "N/A";

      const saleData = {
        productId: "", // No physical inventory product
        productName: oldClientDebtDetails.trim() || "Saldo / Deuda Pendiente Histórica",
        category: "equipos" as any, // fallback category
        quantity: 1,
        salePrice: debt,
        costPrice: 0,
        profit: 0, // internal profit represents 0 for initial imported debt unless cost is known
        customerName: oldClientName.trim(),
        customerPhone: oldClientPhone.trim() || "N/A",
        customerCedula: cedulaString,
        customerAddress: oldClientAddress.trim() || "N/A",
        customerEmail: oldClientEmail.trim() || "",
        paymentPeriodicity: oldClientPaymentPeriodicity,
        specificPaymentDate: oldClientPaymentPeriodicity === "especifico" ? oldClientSpecificPaymentDate : undefined,
        installmentsCount: parseInt(oldClientInstallmentsCount, 10) || 1,
        date: todayStr,
        month: monthStr,
        paymentMethod: "Crédito",
        paidAmount: 0,
        remainingAmount: debt,
        status: "pendiente" as const,
        abonos: []
      };

      await onRegisterSale(saleData);

      // Clear states
      setShowOldClientModal(false);
      setOldClientName("");
      setOldClientCedulaPrefix("V");
      setOldClientCedulaNumber("");
      setOldClientPhone("");
      setOldClientAddress("");
      setOldClientEmail("");
      setOldClientInitialDebt("");
      setOldClientDebtDetails("");
      setOldClientPaymentPeriodicity("semanal");
      setOldClientSpecificPaymentDate("");
      setOldClientInstallmentsCount("1");
    } catch (err: any) {
      setOldClientFormError(err.message || "Error al registrar cliente antiguo.");
    } finally {
      setIsSubmittingOldClient(false);
    }
  };

  const handleExportClientsToExcel = () => {
    const exportData = customers.map((c) => {
      return {
        "Nombre Completo": c.name,
        "Cédula / RIF": c.cedula,
        "Teléfono": c.phone,
        "Dirección": c.address,
        "Correo Electrónico": c.email,
        "Total de Compras Realizadas ($)": c.totalPurchases,
        "Saldo Deudor Pendiente ($)": c.outstandingDebt
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

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

    XLSX.writeFile(workbook, "Reporte_Clientes_SinGlutenpzo.xlsx");
  };

  // Group sales into unique customers with robust matching
  const cleanCedula = (val: string) => val ? val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : "";
  const cleanName = (val: string) => val ? val.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

  const customers: CustomerGroup[] = [];
  sales.forEach((sale) => {
    const cedula = sale.customerCedula || "N/A";
    const name = sale.customerName || "Cliente General";
    const phone = sale.customerPhone || "N/A";
    const address = sale.customerAddress || "N/A";
    const email = sale.customerEmail || "";

    const saleCleanCed = cleanCedula(cedula);
    const saleCleanName = cleanName(name);

    let existing = customers.find((c) => {
      const cCleanCed = cleanCedula(c.cedula);
      const cCleanName = cleanName(c.name);
      
      const cedMatch = cCleanCed && saleCleanCed && cCleanCed !== "NA" && cCleanCed === saleCleanCed;
      const nameMatch = cCleanName && saleCleanName && saleCleanName !== "cliente general" && cCleanName === saleCleanName;
      const phoneMatch = c.phone !== "N/A" && phone !== "N/A" && c.phone.replace(/[^0-9]/g, "") === phone.replace(/[^0-9]/g, "");

      return cedMatch || nameMatch || phoneMatch;
    });

    const totalSaleVal = sale.salePrice * sale.quantity;
    const remainingVal = sale.remainingAmount !== undefined ? sale.remainingAmount : 0;

    if (existing) {
      existing.sales.push(sale);
      existing.totalPurchases += totalSaleVal;
      existing.outstandingDebt += remainingVal;
      
      // Update missing / placeholder details
      if (existing.cedula === "N/A" && cedula !== "N/A") existing.cedula = cedula;
      if (existing.name === "Cliente General" && name !== "Cliente General") existing.name = name;
      if (existing.address === "N/A" && address !== "N/A") existing.address = address;
      if (existing.phone === "N/A" && phone !== "N/A") existing.phone = phone;
      if (!existing.email && email) existing.email = email;
    } else {
      customers.push({
        name,
        cedula,
        phone,
        address,
        email,
        totalPurchases: totalSaleVal,
        outstandingDebt: remainingVal,
        sales: [sale]
      });
    }
  });

  // Helper to format Date as local YYYY-MM-DD
  const formatDateLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Helper to get exactly 42 grid cells representing the month view
  const getCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    let startDay = firstDay.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    startDay = startDay === 0 ? 6 : startDay - 1; // Adjust to Monday-first (0 = Mon, ..., 6 = Sun)

    const days = [];

    // Filler from previous month
    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLast - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    const currentMonthLast = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= currentMonthLast; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Filler for next month (to fill the 42 cells)
    const totalCells = 42;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const friendlyDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr + "T00:00:00");
    const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const dayName = daysOfWeek[d.getDay()];
    const dayNum = d.getDate();
    const monthName = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${dayName} ${dayNum} de ${monthName}, ${year}`;
  };

  const handlePrevMonth = () => {
    setCurrentCalendarMonth(
      new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentCalendarMonth(
      new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 1)
    );
  };

  const calendarCells = getCalendarDays(
    currentCalendarMonth.getFullYear(),
    currentCalendarMonth.getMonth()
  );

  // Today string for calculations
  const todayStr = new Date().toISOString().split("T")[0];
  const todayObj = new Date(todayStr + "T00:00:00");

  // Calculate collections calendar
  const collections: CollectionItem[] = [];
  sales.forEach((sale) => {
    const remaining = sale.remainingAmount !== undefined ? sale.remainingAmount : 0;
    if (sale.status === "pendiente" || remaining > 0) {
      // Find the last payment/abono date, or default to creation date
      let lastPaymentDate = sale.date;
      if (sale.abonos && sale.abonos.length > 0) {
        // Sort descending and get latest
        const sortedAbonos = [...sale.abonos].sort((a, b) => b.date.localeCompare(a.date));
        lastPaymentDate = sortedAbonos[0].date;
      }

      // Calculate next due date
      const periodicity = sale.paymentPeriodicity || "semanal";
      let dueDateStr = sale.specificPaymentDate || sale.date;

      if (periodicity === "semanal") {
        const lastDate = new Date(lastPaymentDate + "T00:00:00");
        lastDate.setDate(lastDate.getDate() + 7);
        dueDateStr = lastDate.toISOString().split("T")[0];
      } else if (periodicity === "quincenal") {
        const lastDate = new Date(lastPaymentDate + "T00:00:00");
        lastDate.setDate(lastDate.getDate() + 15);
        dueDateStr = lastDate.toISOString().split("T")[0];
      } else if (periodicity === "mensual") {
        const lastDate = new Date(lastPaymentDate + "T00:00:00");
        lastDate.setDate(lastDate.getDate() + 30);
        dueDateStr = lastDate.toISOString().split("T")[0];
      }

      const dueObj = new Date(dueDateStr + "T00:00:00");
      let status: "vencido" | "hoy" | "pendiente" = "pendiente";

      if (dueDateStr === todayStr) {
        status = "hoy";
      } else if (dueObj < todayObj) {
        status = "vencido";
      }

      collections.push({
        id: sale.id,
        customerName: sale.customerName || "Cliente General",
        customerPhone: sale.customerPhone || "N/A",
        customerCedula: sale.customerCedula || "N/A",
        customerAddress: sale.customerAddress || "N/A",
        productName: sale.productName,
        totalAmount: sale.salePrice * sale.quantity,
        paidAmount: sale.paidAmount !== undefined ? sale.paidAmount : (sale.salePrice * sale.quantity),
        remainingAmount: remaining,
        dueDate: dueDateStr,
        dueDateObj: dueObj,
        periodicity,
        status,
        sale
      });
    }
  });

  // Sort collections chronologically
  collections.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Map collections by date
  const collectionsByDate: { [dateStr: string]: CollectionItem[] } = {};
  collections.forEach((item) => {
    const dStr = item.dueDate;
    if (!collectionsByDate[dStr]) {
      collectionsByDate[dStr] = [];
    }
    collectionsByDate[dStr].push(item);
  });

  // Filter Directory
  const filteredCustomers = customers.filter((c) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cedula.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter Calendar Schedule
  const filteredCollections = collections.filter((item) => {
    const matchesSearch = item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.customerCedula.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.productName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (calendarFilter === "vencidos") {
      return item.status === "vencido";
    }
    if (calendarFilter === "hoy") {
      return item.status === "hoy";
    }
    if (calendarFilter === "semana") {
      const nextWeek = new Date(todayObj);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return item.dueDateObj >= todayObj && item.dueDateObj <= nextWeek;
    }
    return true; // "todos"
  });

  const handleLocalAbonoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAbonoError("");

    if (!selectedAbonoSale || !onUpdateSaleDebt) return;

    const amt = parseFloat(abonoAmount);
    const max = selectedAbonoSale.remainingAmount !== undefined ? selectedAbonoSale.remainingAmount : 0;

    if (isNaN(amt) || amt <= 0) {
      setAbonoError("Por favor ingresa un monto válido mayor a cero.");
      return;
    }

    if (amt > max) {
      setAbonoError(`El monto no puede superar el saldo pendiente de $${max}.`);
      return;
    }

    setIsSubmittingAbono(true);
    const finalAbonoDate = abonoDate || new Date().toISOString().split("T")[0];
    try {
      await onUpdateSaleDebt(selectedAbonoSale.id, amt, abonoPaymentMethod, finalAbonoDate);
      setSelectedAbonoSale(null);
      setAbonoAmount("");
      setAbonoPaymentMethod("Efectivo");
      // If customer is viewing details, update selection as well
      if (selectedCustomer) {
        const updatedSales = selectedCustomer.sales.map((s) => {
          if (s.id === selectedAbonoSale.id) {
            const currentPaid = s.paidAmount !== undefined ? s.paidAmount : (s.salePrice * s.quantity);
            const total = s.salePrice * s.quantity;
            const newPaid = Math.min(total, currentPaid + amt);
            const newRemaining = Math.max(0, total - newPaid);
            const updatedAbonos = s.abonos || [];
            return {
              ...s,
              paidAmount: newPaid,
              remainingAmount: newRemaining,
              status: newRemaining === 0 ? ("pagado" as const) : ("pendiente" as const),
              abonos: [...updatedAbonos, { date: finalAbonoDate, amount: amt, paymentMethod: abonoPaymentMethod }]
            };
          }
          return s;
        });

        // Recompute customer group state locally for instant UI update
        const updatedDebt = Math.max(0, selectedCustomer.outstandingDebt - amt);
        setSelectedCustomer({
          ...selectedCustomer,
          outstandingDebt: updatedDebt,
          sales: updatedSales
        });
      }
    } catch (err: any) {
      setAbonoError(err.message || "Error al guardar el abono.");
    } finally {
      setIsSubmittingAbono(false);
    }
  };

  const sendWhatsAppReminder = (item: CollectionItem) => {
    const formattedPhone = item.customerPhone.replace(/[^0-9]/g, "");
    if (!formattedPhone || formattedPhone === "N/A" || formattedPhone.length < 5) {
      alert("Este cliente no posee un número de teléfono válido registrado para WhatsApp.");
      return;
    }

    const periodicityWord = 
      item.periodicity === "semanal" ? "semanal" :
      item.periodicity === "quincenal" ? "quincenal" :
      item.periodicity === "mensual" ? "mensual" : "acordado";

    const text = `Hola *${item.customerName}*, te saludamos de *SinGlutenpzo (Oriven Distribuidora de Alimentos)* 🌾🍰✨.\n\n` +
      `📌 *RECORDATORIO DE PAGO / COBRO PENDIENTE*\n` +
      `Le recordamos cordialmente que mantiene un *monto pendiente por cancelar de $${item.remainingAmount.toLocaleString()}* correspondiente a su plan de pago *${periodicityWord}* por la compra de *${item.productName}*.\n\n` +
      `📅 *Fecha de Vencimiento:* ${item.dueDate}\n` +
      `💵 *Monto Pendiente:* $${item.remainingAmount.toLocaleString()}\n\n` +
      `Por favor confírmanos tu pago por esta vía enviando tu comprobante de transferencia o pago móvil. ¡Muchas gracias por tu atención y preferencia!`;

    const encodedText = encodeURIComponent(text);
    const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`;
    window.open(url, "_blank");
  };

  const handleShareWhatsApp = (sale: Sale) => {
    const cleanPhone = sale.customerPhone.replace(/[^0-9]/g, "");
    let finalPhone = cleanPhone;
    if (cleanPhone.length > 0) {
      if (cleanPhone.startsWith("0")) {
        finalPhone = "58" + cleanPhone.slice(1);
      } else if (!cleanPhone.startsWith("58") && cleanPhone.length === 10) {
        finalPhone = "58" + cleanPhone;
      }
    }

    const receiptId = sale.invoiceNumber || "000001";
    const controlId = sale.controlNumber || sale.invoiceNumber || "000001";
    const abonosStr = sale.abonos && sale.abonos.length > 0 
      ? `\n*HISTORIAL DE ABONOS RECIBIDOS:*\n` + sale.abonos.map(ab => `- *${ab.date}* (${ab.paymentMethod}): +$${ab.amount.toLocaleString()}`).join("\n")
      : "";

    const isPending = sale.status === "pendiente" || (sale.remainingAmount !== undefined && sale.remainingAmount > 0);
    const planDeCobro = isPending
      ? `\n⚠️ *ESTADO DE CUENTA (CRÉDITO)*\n🗓️ *Plan de Cobro:* ${sale.paymentPeriodicity ? sale.paymentPeriodicity.toUpperCase() : "PENDIENTE"}\n❌ *Saldo Pendiente por Cobrar:* $${(sale.remainingAmount || 0).toLocaleString()}`
      : `\n🎉 *ESTADO DE CUENTA:* ¡TOTALMENTE SALDADA! ¡Muchas gracias por su compra!`;

    const text = `*SINGLUTENPZO* 🌾🍰✨\n` +
      `*Oriven Distribuidora de Alimentos J-40633400-6*\n` +
      `*Productos Sin Gluten & Postres Saludables*\n` +
      `----------------------------------------\n` +
      `*RECIBO DE VENTA Y ESTADO DE CUENTA*\n` +
      `🧾 *Recibo Nº:* #${receiptId}\n` +
      `🔢 *Nº Control:* #${controlId}\n` +
      `📅 *Fecha:* ${sale.date}\n` +
      `----------------------------------------\n` +
      `👤 *Cliente:* ${sale.customerName}\n` +
      `🪪 *Cédula/RIF:* ${sale.customerCedula || "N/A"}\n` +
      `📞 *Teléfono:* ${sale.customerPhone}\n` +
      `📍 *Dirección:* ${sale.customerAddress || "N/A"}\n` +
      `----------------------------------------\n` +
      `📦 *Concepto:* ${sale.productName}\n` +
      `🔢 *Cantidad:* ${sale.quantity}\n` +
      `💲 *Precio Unitario:* $${sale.salePrice.toLocaleString()}\n` +
      `💰 *Monto Total:* $${(sale.salePrice * sale.quantity).toLocaleString()}\n` +
      `----------------------------------------\n` +
      `💳 *Método de Pago:* ${sale.paymentMethod}\n` +
      `💵 *Monto Cancelado:* $${(sale.paidAmount !== undefined ? sale.paidAmount : (sale.salePrice * sale.quantity)).toLocaleString()}\n` +
      `${planDeCobro}\n` +
      `${abonosStr}\n\n` +
      `----------------------------------------\n` +
      `🌾 *SinGlutenpzo (Oriven) - Gracias por su preferencia.*`;

    const url = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleSendWhatsAppThankYou = (sale: Sale) => {
    const cleanPhone = (sale.customerPhone || "").replace(/[^0-9]/g, "");
    let finalPhone = cleanPhone;
    if (cleanPhone.length > 0) {
      if (cleanPhone.startsWith("0")) {
        finalPhone = "58" + cleanPhone.slice(1);
      } else if (!cleanPhone.startsWith("58") && cleanPhone.length === 10) {
        finalPhone = "58" + cleanPhone;
      }
    }

    const totalAmount = (sale.salePrice * sale.quantity).toLocaleString();
    const customerName = sale.customerName && sale.customerName !== "Cliente General" ? sale.customerName : "";
    const greeting = customerName ? `Estimado(a) *${customerName}*` : "Estimado(a) cliente";

    const isContado = sale.status === "pagado" && (!sale.abonos || sale.abonos.length === 0);
    const detailText = isContado
      ? `Queremos agradecerle sinceramente por su compra de contado de *$${totalAmount}* correspondiente a *${sale.productName}*.`
      : `Queremos agradecerle sinceramente por cancelar la totalidad de su saldo adeudado por un monto total de *$${totalAmount}* correspondiente a *${sale.productName}*. Su cuenta se encuentra *TOTALMENTE AL DÍA Y SALDADA* 🎉.`;

    const text = `*SINGLUTENPZO* 🌾🍰✨\n` +
      `*Oriven Distribuidora de Alimentos J-40633400-6*\n` +
      `----------------------------------------\n` +
      `¡Hola! ${greeting}, le saludamos con mucho gusto.\n\n` +
      `💚 *¡MUCHAS GRACIAS POR SU COMPRA Y CONFIANZA!*\n\n` +
      `${detailText}\n\n` +
      `Ha sido un verdadero placer atenderle. Le recordamos que elaboramos y distribuimos productos libres de gluten, hechos con harinas nutritivas alternativas y postres saludables de la más alta calidad.\n\n` +
      `✨ *Estamos completamente a su orden para su próximo pedido.* ¡Que tenga un feliz y bendecido día! 🌾📦`;

    const url = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleDownloadReceiptImage = async () => {
    if (!selectedReceiptSale) return;
    setIsGeneratingImage(true);
    try {
      await downloadReceiptImage(selectedReceiptSale, receiptRef.current);
    } catch (err) {
      console.error("Error al descargar la imagen del recibo:", err);
      alert("No se pudo generar la imagen del recibo.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleShareReceiptImage = async () => {
    if (!selectedReceiptSale) return;
    setIsGeneratingImage(true);
    try {
      await shareReceiptImage(selectedReceiptSale, receiptRef.current, () => {
        handleShareWhatsApp(selectedReceiptSale);
      });
    } catch (err) {
      console.error("Error al preparar la imagen:", err);
      alert("No se pudo generar la imagen del recibo. Abriendo WhatsApp con el texto.");
      handleShareWhatsApp(selectedReceiptSale);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSendEmailOnDemand = async (sale: Sale) => {
    if (!sale.customerEmail) {
      alert("Este cliente no tiene un correo electrónico registrado.");
      return;
    }
    setIsSendingEmail(true);
    try {
      const res = await fetch("/api/sales/send-email-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId: sale.id }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Factura digital enviada exitosamente por correo a " + sale.customerEmail);
      } else {
        alert("⚠️ No se pudo enviar el correo: " + (data.message || "Error del servidor SMTP"));
      }
    } catch (err: any) {
      alert("⚠️ Error al conectar con el servidor para enviar el correo.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Clientes & Cobros</h2>
          <p className="text-sm text-slate-500 font-medium">Controla las cuentas por cobrar, historial detallado de abonos y el calendario para cobradores</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
          {/* Action buttons */}
          <button
            onClick={handleExportClientsToExcel}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-500/20 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={() => {
              setOldClientFormError("");
              setShowOldClientModal(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-blue-500/25"
          >
            <Plus className="h-4 w-4" />
            <span>Cliente Antiguo</span>
          </button>

          <button
            onClick={() => {
              setParseError("");
              setParsedClients([]);
              setBulkText("");
              setFileBase64(null);
              setFileName("");
              setShowBulkUpload(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-blue-500/25"
          >
            <FileText className="h-4 w-4" />
            <span>Carga Masiva IA</span>
          </button>

          {/* Sub tabs switcher */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
            <button
              onClick={() => { setSubTab("directorio"); setSearchTerm(""); }}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                subTab === "directorio"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Directorio</span>
            </button>
            <button
              onClick={() => { setSubTab("calendario"); setSearchTerm(""); }}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                subTab === "calendario"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              <span>Calendario</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Stats Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Clientes Registrados</p>
            <h4 className="text-2xl font-black text-slate-800">{customers.length}</h4>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Cuentas por Cobrar</p>
            <h4 className="text-2xl font-black text-rose-600">
              ${customers.reduce((acc, c) => acc + c.outstandingDebt, 0).toLocaleString()}
            </h4>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cobros Pendientes/Vencidos</p>
            <h4 className="text-2xl font-black text-amber-600">
              {collections.length}
            </h4>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              subTab === "directorio"
                ? "Buscar cliente por nombre, cédula o teléfono..."
                : "Buscar cobro por cliente, producto o cédula..."
            }
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-2xl text-sm font-medium transition-all outline-none"
          />
        </div>

        {/* Calendar filters */}
        {subTab === "calendario" && (
          <div className="flex bg-slate-100 p-1 rounded-xl space-x-1 border border-slate-200/50">
            {[
              { id: "todos", label: "Todos" },
              { id: "vencidos", label: "Vencidos 🚨" },
              { id: "hoy", label: "Hoy 📅" },
              { id: "semana", label: "Próx. 7 días" }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setCalendarFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  calendarFilter === f.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MAIN LAYOUT CONTAINER */}
      {subTab === "directorio" ? (
        <div className="space-y-4">
          {selectedCustomerCedulas.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-sm">
                  {selectedCustomerCedulas.length}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">Clientes seleccionados</p>
                  <p className="text-xs text-slate-500 font-medium">Puedes realizar acciones masivas sobre los clientes seleccionados</p>
                </div>
              </div>
              <div className="flex space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleOpenBulkEditModal}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
                >
                  <Edit className="h-4 w-4" />
                  <span>Modificar Selección</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelectedCustomers}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Eliminar Selección</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerCedulas([])}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 uppercase"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-wider border-b border-slate-100">
                    <th className="p-4 pl-6 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={filteredCustomers.length > 0 && filteredCustomers.every(c => selectedCustomerCedulas.includes(c.cedula))}
                        onChange={handleToggleAllCustomers}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                    </th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Identificación / Cédula</th>
                    <th className="p-4">Contacto</th>
                    <th className="p-4">Dirección</th>
                    <th className="p-4">Total Compras</th>
                    <th className="p-4 text-right pr-6">Saldo Deudor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 font-bold">
                        No se encontraron clientes registrados con ese filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c, index) => {
                      const isSelected = selectedCustomerCedulas.includes(c.cedula);
                      return (
                        <tr
                          key={index}
                          onClick={() => setSelectedCustomer(c)}
                          className={`hover:bg-slate-50/50 cursor-pointer transition-colors group ${
                            isSelected ? "bg-blue-50/30" : ""
                          }`}
                        >
                          <td className="p-4 pl-6 text-center w-12" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleCustomerSelection(c.cedula)}
                              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-4 flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-black">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors">{c.name}</p>
                              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400">
                                {c.sales.length} facturas
                              </span>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-xs">{c.cedula}</td>
                          <td className="p-4 text-xs">{c.phone}</td>
                          <td className="p-4 text-xs max-w-[200px] truncate" title={c.address}>{c.address}</td>
                          <td className="p-4 font-extrabold text-slate-800">${c.totalPurchases.toLocaleString()}</td>
                          <td className="p-4 text-right pr-6">
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                              c.outstandingDebt > 0
                                ? "bg-rose-50 text-rose-600 border border-rose-100/50"
                                : "bg-emerald-50 text-emerald-600 border border-emerald-100/50"
                            }`}>
                              ${c.outstandingDebt.toLocaleString()}
                            </span>
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
      ) : (
        /* COLLECTION CALENDAR VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Calendar Side (7 cols on lg) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">
                  {monthNames[currentCalendarMonth.getMonth()]} {currentCalendarMonth.getFullYear()}
                </h3>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Calendario de Cobros Recurrentes
                </p>
              </div>

              <div className="flex space-x-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-white hover:shadow-sm text-slate-600 hover:text-blue-600 rounded-xl transition-all cursor-pointer"
                  title="Mes Anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentCalendarMonth(new Date());
                    setSelectedCalendarDate(todayStr);
                  }}
                  className="px-3 py-1 bg-white border border-slate-100 rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:text-blue-600 shadow-sm transition-all cursor-pointer"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-white hover:shadow-sm text-slate-600 hover:text-blue-600 rounded-xl transition-all cursor-pointer"
                  title="Siguiente Mes"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="space-y-2">
              {/* Weekdays */}
              <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider pb-1">
                <span>Lu</span>
                <span>Ma</span>
                <span>Mi</span>
                <span>Ju</span>
                <span>Vi</span>
                <span>Sá</span>
                <span>Do</span>
              </div>

              {/* Days cells */}
              <div className="grid grid-cols-7 gap-2">
                {calendarCells.map((cell, idx) => {
                  const dateStr = formatDateLocal(cell.date);
                  const cellCollections = collectionsByDate[dateStr] || [];
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedCalendarDate;
                  const hasCollection = cellCollections.length > 0;

                  // Filter collections inside this day by the search query if any
                  const matchesSearch = cellCollections.filter(item => {
                    if (!searchTerm) return true;
                    return item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.customerCedula.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.productName.toLowerCase().includes(searchTerm.toLowerCase());
                  }).length > 0;

                  // Define cell styles
                  let cellStyle = "aspect-square rounded-2xl flex flex-col items-center justify-between p-2 text-xs relative transition-all cursor-pointer ";
                  
                  if (hasCollection) {
                    if (isSelected) {
                      cellStyle += "bg-rose-600 text-white font-black shadow-md shadow-rose-200 ring-2 ring-offset-2 ring-rose-500 scale-[1.03] z-10";
                    } else {
                      cellStyle += "bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 font-bold";
                    }
                  } else {
                    if (isSelected) {
                      cellStyle += "bg-blue-600 text-white font-black shadow-md shadow-blue-200 ring-2 ring-offset-2 ring-blue-500 scale-[1.03] z-10";
                    } else if (isToday) {
                      cellStyle += "bg-slate-100 border border-slate-300 text-slate-800 font-bold hover:bg-slate-200";
                    } else {
                      cellStyle += "bg-white hover:bg-slate-50 border border-slate-100 ";
                      if (cell.isCurrentMonth) {
                        cellStyle += "text-slate-700";
                      } else {
                        cellStyle += "text-slate-300";
                      }
                    }
                  }

                  // Extra highlight ring if day matched search query
                  const searchRing = (searchTerm && matchesSearch) ? "ring-2 ring-blue-500 ring-offset-1" : "";

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedCalendarDate(dateStr)}
                      className={`${cellStyle} ${searchRing}`}
                    >
                      {/* Day number */}
                      <span className="self-start text-[11px] leading-none">
                        {cell.date.getDate()}
                      </span>

                      {/* Collection indicators */}
                      {hasCollection && (
                        <div className="w-full flex justify-end items-center gap-1 mt-auto">
                          {/* Circle badge with collection count */}
                          <span className={`h-4 min-w-[16px] px-1 rounded-full text-[9px] font-black flex items-center justify-center ${
                            isSelected ? "bg-white text-rose-600" : "bg-rose-600 text-white"
                          }`}>
                            {cellCollections.length}
                          </span>
                        </div>
                      )}
                      
                      {/* Today dot indicator */}
                      {isToday && !isSelected && (
                        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-blue-600 rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calendar Legend */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              <span className="flex items-center space-x-1.5">
                <span className="h-3.5 w-3.5 rounded-lg bg-rose-50 border border-rose-300 block" />
                <span>Cobranzas Programadas (Rojo)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="h-3.5 w-3.5 rounded-lg bg-slate-100 border border-slate-300 block" />
                <span>Día de Hoy</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="h-3.5 w-3.5 rounded-lg bg-blue-600 block" />
                <span>Seleccionado</span>
              </span>
            </div>
          </div>

          {/* Details Side (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-slate-800 text-blue-400 rounded-2xl border border-slate-700">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight text-white">
                    Detalle de Cobros Diarios
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {friendlyDate(selectedCalendarDate)}
                  </p>
                </div>
              </div>

              {/* Day stats */}
              {(() => {
                const dayCollections = collectionsByDate[selectedCalendarDate] || [];
                const totalPendingAmt = dayCollections.reduce((acc, curr) => acc + curr.remainingAmount, 0);
                return (
                  <div className="grid grid-cols-2 gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700/80 text-center">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Clientes</span>
                      <span className="text-base font-black text-white">{dayCollections.length}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Por Cobrar</span>
                      <span className="text-base font-black text-rose-400">${totalPendingAmt.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* List of collections for that day */}
            <div className="space-y-4">
              {(() => {
                const dayCollections = collectionsByDate[selectedCalendarDate] || [];
                
                // Filter by search term
                const matchedDayCollections = dayCollections.filter((item) => {
                  if (!searchTerm) return true;
                  return item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.customerCedula.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.productName.toLowerCase().includes(searchTerm.toLowerCase());
                });

                if (matchedDayCollections.length === 0) {
                  return (
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center text-slate-400 shadow-sm space-y-3">
                      <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-extrabold text-slate-800 text-sm">¡Ningún cobro pendiente!</p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          No tienes cuentas registradas para cobrar en esta fecha específica.
                        </p>
                      </div>
                    </div>
                  );
                }

                return matchedDayCollections.map((item) => {
                  const sale = item.sale;
                  const totalAbonosCount = sale.abonos?.length || 0;
                  const currentCuota = totalAbonosCount + 1;
                  const hasMultipleCuotas = sale.installmentsCount !== undefined && sale.installmentsCount > 1;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white p-5 rounded-3xl border shadow-sm space-y-4 hover:shadow-md transition-all border-slate-100`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-3">
                          <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-black flex-shrink-0 text-sm">
                            {item.customerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                              <h5 className="font-extrabold text-slate-800 tracking-tight text-sm">
                                {item.customerName}
                              </h5>
                              <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase">
                                {item.periodicity}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-semibold">
                              Cédula: <span className="text-slate-600 font-bold">{item.customerCedula}</span> | Tlf: <span className="text-slate-600 font-bold">{item.customerPhone}</span>
                            </p>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold flex-shrink-0 ${
                          item.status === "vencido"
                            ? "bg-rose-50 text-rose-600 border border-rose-100"
                            : item.status === "hoy"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-blue-50 text-blue-700 border border-blue-100"
                        }`}>
                          {item.status === "vencido" ? "Vencido" : item.status === "hoy" ? "Hoy" : "Pendiente"}
                        </span>
                      </div>

                      {/* Installment Badge and details */}
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-slate-800">
                            {item.productName}
                          </span>
                          <span className="text-slate-500 font-medium">
                            {sale.quantity} x ${sale.salePrice.toLocaleString()}
                          </span>
                        </div>

                        {hasMultipleCuotas && (
                          <div className="flex justify-between items-center text-[10px] bg-blue-50 border border-blue-100 p-2 rounded-xl text-blue-700 font-extrabold uppercase tracking-wide">
                            <span>Plan: Cuotas Recurrentes</span>
                            <span className="bg-blue-600 text-white px-2 py-0.5 rounded-lg text-[9px]">
                              Cuota {currentCuota} de {sale.installmentsCount}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 font-semibold text-slate-500">
                          <span>Total Venta:</span>
                          <span className="text-slate-800">${(sale.salePrice * sale.quantity).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center font-semibold text-slate-500">
                          <span>Abonado hasta hoy:</span>
                          <span className="text-emerald-600 font-extrabold">+${item.paidAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center font-extrabold text-rose-600 pt-1 border-t border-slate-200/60">
                          <span>Saldo Restante:</span>
                          <span>${item.remainingAmount.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-50">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-400 truncate max-w-[140px] uppercase block" title={item.customerAddress}>
                            {item.customerAddress}
                          </span>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => sendWhatsAppReminder(item)}
                            title="Enviar recordatorio de cobro por WhatsApp"
                            className="p-2 bg-green-50 hover:bg-green-600 text-green-600 hover:text-white border border-green-500/20 rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAbonoSale(sale);
                              setAbonoAmount("");
                              setAbonoDate(new Date().toISOString().split("T")[0]);
                            }}
                            className="flex items-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>Abonar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER DETAIL DRAWER / MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[80] flex items-center justify-end">
          <div className="bg-white h-full w-full max-w-2xl shadow-2xl flex flex-col border-l border-slate-100 animate-slide-in">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-black">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950 tracking-tight">{selectedCustomer.name}</h3>
                  <p className="text-xs text-slate-400 font-semibold">Cédula: {selectedCustomer.cedula} | Tel: {selectedCustomer.phone}{selectedCustomer.email && ` | Correo: ${selectedCustomer.email}`}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-full"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* Customer summary */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Comprado</span>
                  <span className="text-lg font-black text-slate-800">${selectedCustomer.totalPurchases.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Saldo Pendiente Actual</span>
                  <span className={`text-lg font-black ${selectedCustomer.outstandingDebt > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    ${selectedCustomer.outstandingDebt.toLocaleString()}
                  </span>
                </div>
                <div className="col-span-2 text-left text-xs font-semibold text-slate-500 pt-2 border-t border-slate-200 flex items-center space-x-1">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>Dirección: <strong className="text-slate-700 font-bold">{selectedCustomer.address}</strong></span>
                </div>
              </div>

              {/* Acciones de Administración */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 flex items-center justify-between gap-4 animate-fade-in">
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Acciones Administrativas</p>
                  <p className="text-[10px] text-slate-400 font-semibold">Modifica los datos del cliente o elimínalo del sistema.</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditName(selectedCustomer.name);
                      setEditCedula(selectedCustomer.cedula);
                      setEditPhone(selectedCustomer.phone);
                      setEditAddress(selectedCustomer.address);
                      setEditEmail(selectedCustomer.email || "");
                      setIsEditingCustomer(true);
                    }}
                    className="flex items-center space-x-1 px-3 py-2 bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-600 border border-blue-200 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Editar</span>
                  </button>
                   <button
                    onClick={() => {
                      askConfirmation(
                        "Eliminar Cliente",
                        `¿Estás completamente seguro de que deseas eliminar a ${selectedCustomer.name} de la base de datos?\n\n¡ADVERTENCIA: Esta acción es irreversible y eliminará todo su historial de ventas y cobros en el sistema!`,
                        async () => {
                          try {
                            if (onDeleteClient) {
                              await onDeleteClient(selectedCustomer.cedula, selectedCustomer.name);
                              setSelectedCustomer(null);
                              alert("Cliente eliminado con éxito del sistema.");
                            }
                          } catch (err) {
                            alert("Error al eliminar el cliente.");
                          }
                        }
                      );
                    }}
                    className="flex items-center space-x-1 px-3 py-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>

              {/* Purchase and Payment History Board */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Historial de Compras & Abonos</h4>

                <div className="space-y-4">
                  {selectedCustomer.sales.map((sale) => {
                    const rAmt = sale.remainingAmount !== undefined ? sale.remainingAmount : 0;
                    return (
                      <div key={sale.id} className="border border-slate-100 rounded-2xl p-4 space-y-3 shadow-sm hover:border-slate-200 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-slate-400 font-mono font-bold">RECIBO Nº: #{sale.invoiceNumber || "000001"} | CONTROL Nº: #{sale.controlNumber || sale.invoiceNumber || "000001"} | {sale.date}</span>
                            <h5 className="font-extrabold text-slate-800">{sale.productName}</h5>
                            <p className="text-xs text-slate-500 font-medium">
                              Monto: {sale.quantity} x ${sale.salePrice.toLocaleString()} = <strong className="text-slate-800 font-extrabold">${(sale.salePrice * sale.quantity).toLocaleString()}</strong>
                            </p>
                          </div>

                          <div className="text-right flex flex-col items-end">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold ${
                              rAmt > 0
                                ? "bg-amber-50 text-amber-600 border border-amber-100"
                                : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            }`}>
                              {rAmt > 0 ? "Credito / Pendiente" : "Saldado / Pagado"}
                            </span>
                            {sale.paymentPeriodicity && rAmt > 0 && (
                              <span className="text-[10px] text-blue-600 font-extrabold mt-1 uppercase">
                                Plan: {sale.paymentPeriodicity}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* List of abonos on this specific sale */}
                        {sale.abonos && sale.abonos.length > 0 && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-xs">
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Abonos realizados a esta factura:</p>
                            <div className="space-y-1">
                              {sale.abonos.map((ab, idx) => (
                                <div key={idx} className="flex justify-between font-semibold text-slate-600">
                                  <span>{ab.date} ({ab.paymentMethod}):</span>
                                  <span className="font-extrabold text-emerald-600">+${ab.amount.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5">
                          <span className="font-semibold text-slate-500">
                            Deuda Pendiente: <strong className={`${rAmt > 0 ? "text-rose-600" : "text-slate-500"} font-extrabold`}>${rAmt.toLocaleString()}</strong>
                          </span>

                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => setSelectedReceiptSale(sale)}
                              title="Ver / Descargar Recibo PNG"
                              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm animate-fade-in"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Recibo</span>
                            </button>
                            <button
                              onClick={() => handleShareWhatsApp(sale)}
                              title="Enviar Factura / Estado de Cuenta por WhatsApp"
                              className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm animate-fade-in"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>WhatsApp</span>
                            </button>
                            {rAmt === 0 && (
                              <button
                                onClick={() => handleSendWhatsAppThankYou(sale)}
                                title="Enviar mensaje de agradecimiento y quedamos a la orden para su nuevo pedido por WhatsApp"
                                className="flex items-center space-x-1 px-3 py-1.5 bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-200 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm animate-fade-in"
                              >
                                <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
                                <span>Agradecimiento</span>
                              </button>
                            )}
                            {rAmt > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedAbonoSale(sale);
                                  setAbonoAmount("");
                                  setAbonoDate(new Date().toISOString().split("T")[0]);
                                }}
                                className="px-3 py-1.5 bg-blue-100 hover:bg-blue-600 text-blue-700 hover:text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-sm"
                              >
                                Registrar Abono
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REGIONAL ABONO / PAYMENT MODAL */}
      {selectedAbonoSale && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[90] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-xl p-4 sm:p-6 shadow-2xl relative border border-slate-100 space-y-6 animate-fade-in my-auto max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setSelectedAbonoSale(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <span>Registrar Abono / Pago</span>
              </h3>
              <p className="text-xs text-slate-500">
                Registrar un abono para la cuenta de <span className="font-extrabold text-slate-800">{selectedAbonoSale.customerName}</span>.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5 text-xs font-semibold text-slate-600">
              <p>Producto: <span className="text-slate-900 font-bold">{selectedAbonoSale.productName}</span></p>
              <p>Monto Pagado: <span className="text-emerald-600 font-bold">${(selectedAbonoSale.paidAmount || 0).toLocaleString()}</span></p>
              <p className="text-rose-600 font-extrabold bg-rose-50 p-2.5 rounded-xl mt-2 flex justify-between border border-rose-100">
                <span>Deuda Pendiente:</span>
                <span>${(selectedAbonoSale.remainingAmount || 0).toLocaleString()}</span>
              </p>
            </div>

            <form onSubmit={handleLocalAbonoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Monto a Abonar $</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    max={selectedAbonoSale.remainingAmount}
                    placeholder={`Máximo $${selectedAbonoSale.remainingAmount}`}
                    value={abonoAmount}
                    onChange={(e) => setAbonoAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Método de Pago</label>
                  <select
                    value={abonoPaymentMethod}
                    onChange={(e) => setAbonoPaymentMethod(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Pago Móvil">Pago Móvil</option>
                    <option value="Zelle">Zelle</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta de Débito/Crédito">Tarjeta</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Fecha del Abono</label>
                  <input
                    type="date"
                    required
                    value={abonoDate}
                    onChange={(e) => setAbonoDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                  />
                </div>
              </div>

              {abonoError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                  {abonoError}
                </p>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAbonoSale(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAbono}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md"
                >
                  {isSubmittingAbono ? "Guardando..." : "Registrar Abono"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {isEditingCustomer && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[90] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative border border-slate-100 space-y-6 animate-fade-in my-auto max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsEditingCustomer(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Edit className="h-5 w-5 text-blue-600" />
                <span>Editar Datos del Cliente</span>
              </h3>
              <p className="text-xs text-slate-500">
                Modifica los datos de facturación de <span className="font-extrabold text-slate-800">{selectedCustomer.name}</span>. Todos los registros históricos de compras asociados se actualizarán automáticamente.
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmittingEdit(true);
                try {
                  if (onUpdateClient) {
                    await onUpdateClient(selectedCustomer.cedula, selectedCustomer.name, {
                      name: editName.trim(),
                      phone: editPhone.trim(),
                      cedula: editCedula.trim(),
                      address: editAddress.trim(),
                      email: editEmail.trim()
                    });
                    setIsEditingCustomer(false);
                    setSelectedCustomer(null); // Close drawer to trigger updates
                    alert("Los datos del cliente se actualizaron exitosamente en todas las facturas.");
                  }
                } catch (err: any) {
                  alert("Error al actualizar los datos del cliente: " + (err.message || err));
                } finally {
                  setIsSubmittingEdit(false);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Cédula / RIF / Pasaporte</label>
                  <input
                    type="text"
                    required
                    value={editCedula}
                    onChange={(e) => setEditCedula(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Número de Teléfono</label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Dirección Completa de Habitación</label>
                  <textarea
                    required
                    rows={2}
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingCustomer(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md"
                >
                  {isSubmittingEdit ? "Guardando..." : "Actualizar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGISTER OLD CUSTOMER MODAL */}
      {showOldClientModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[80] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg p-4 sm:p-6 shadow-2xl relative border border-slate-100 space-y-6 animate-fade-in my-auto max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowOldClientModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Registrar Cliente Antiguo (con Deuda)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Registra un cliente antiguo con una deuda inicial pendiente en su cuenta histórica. Esto creará un registro de venta a crédito que podrás controlar y abonar desde el panel.
              </p>
            </div>

            <form onSubmit={handleRegisterOldClientSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nombre Completo del Cliente *</label>
                  <input
                    type="text"
                    required
                    value={oldClientName}
                    onChange={(e) => setOldClientName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Documento</label>
                  <select
                    value={oldClientCedulaPrefix}
                    onChange={(e) => setOldClientCedulaPrefix(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  >
                    <option value="V">Venezolano (V)</option>
                    <option value="E">Extranjero (E)</option>
                    <option value="J">Jurídico / RIF (J)</option>
                    <option value="G">Gubernamental (G)</option>
                    <option value="P">Pasaporte (P)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Número de Identificación</label>
                  <input
                    type="text"
                    value={oldClientCedulaNumber}
                    onChange={(e) => setOldClientCedulaNumber(e.target.value)}
                    placeholder="Ej: 12345678"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={oldClientPhone}
                    onChange={(e) => setOldClientPhone(e.target.value)}
                    placeholder="Ej: +584120000000"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Correo Electrónico</label>
                  <input
                    type="email"
                    value={oldClientEmail}
                    onChange={(e) => setOldClientEmail(e.target.value)}
                    placeholder="Ej: cliente@correo.com"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Dirección de Habitación</label>
                  <input
                    type="text"
                    value={oldClientAddress}
                    onChange={(e) => setOldClientAddress(e.target.value)}
                    placeholder="Ej: Av. Principal, Casa Nro 5"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Monto de Deuda Inicial ($) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={oldClientInitialDebt}
                    onChange={(e) => setOldClientInitialDebt(e.target.value)}
                    placeholder="Ej: 150"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Periodicidad de Cobro</label>
                  <select
                    value={oldClientPaymentPeriodicity}
                    onChange={(e) => setOldClientPaymentPeriodicity(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                  >
                    <option value="semanal">Semanal</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                    <option value="especifico">Fecha Única Específica</option>
                  </select>
                </div>

                {oldClientPaymentPeriodicity === "especifico" && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Fecha Específica de Cobro</label>
                    <input
                      type="date"
                      required
                      value={oldClientSpecificPaymentDate}
                      onChange={(e) => setOldClientSpecificPaymentDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none"
                    />
                  </div>
                )}

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Detalle / Concepto de la Deuda</label>
                  <textarea
                    rows={2}
                    value={oldClientDebtDetails}
                    onChange={(e) => setOldClientDebtDetails(e.target.value)}
                    placeholder="Ej: Saldo pendiente por compra de iPhone 11"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none resize-none"
                  />
                </div>
              </div>

              {oldClientFormError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                  {oldClientFormError}
                </p>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOldClientModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOldClient}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md"
                >
                  {isSubmittingOldClient ? "Registrando..." : "Registrar Deuda"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK UPLOAD WITH GEMINI IA MODAL */}
      {showBulkUpload && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[80] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl p-6 shadow-2xl relative border border-slate-100 space-y-6 animate-fade-in my-8 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowBulkUpload(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1.5 flex-shrink-0">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span>Carga Inteligente de Clientes con IA (Excel, PDF o Imagen)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Sube una lista de clientes con deudas, saldos pendientes, números de teléfono o cédulas desde Excel (.xlsx, .xls), CSV, PDF o capturas de pantalla. Nuestra IA los extraerá y organizará automáticamente.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-4">
              {parsedClients.length === 0 ? (
                <div className="space-y-4">
                  {/* File Dropzone */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={triggerFileSelect}
                    className="border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-3"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".xlsx,.xls,.csv,.pdf,image/*"
                      className="hidden"
                    />
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                      <Download className="h-6 w-6 transform rotate-180" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {fileName ? `Archivo seleccionado: ${fileName}` : "Arrastra tu archivo aquí o haz clic para buscar"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Soporta Excel, CSV, PDF o imágenes de listas de clientes
                      </p>
                    </div>
                  </div>

                  {/* Manual Paste area */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase flex justify-between items-center">
                      <span>O copia y pega el texto de la lista aquí</span>
                      {bulkText && <span className="text-[10px] text-emerald-600">✓ Datos listos</span>}
                    </label>
                    <textarea
                      rows={5}
                      value={bulkText}
                      onChange={(e) => {
                        setBulkText(e.target.value);
                        setFileBase64(null);
                        setFileName("");
                      }}
                      placeholder="Ej:&#10;Juan Perez, V-12345678, Telf 04121234567, Deuda: 120$ concepto celular&#10;Maria Gomez, Telf 04147654321, Deuda: 50$ saldo restante"
                      className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold outline-none resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span>SE HAN DETECTADO {parsedClients.length} CLIENTES</span>
                    <button
                      onClick={() => {
                        const allChecked = selectedParsedClients.every(v => v);
                        setSelectedParsedClients(new Array(parsedClients.length).fill(!allChecked));
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {selectedParsedClients.every(v => v) ? "Deseleccionar todos" : "Seleccionar todos"}
                    </button>
                  </div>

                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <tr>
                          <th className="p-3 w-10"></th>
                          <th className="p-3">Nombre</th>
                          <th className="p-3">Identificación / Cédula</th>
                          <th className="p-3">Teléfono</th>
                          <th className="p-3">Deuda ($)</th>
                          <th className="p-3">Detalle Deuda</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedClients.map((client, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={selectedParsedClients[idx] || false}
                                onChange={(e) => {
                                  const updated = [...selectedParsedClients];
                                  updated[idx] = e.target.checked;
                                  setSelectedParsedClients(updated);
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={client.name || ""}
                                onChange={(e) => {
                                  const updated = [...parsedClients];
                                  updated[idx].name = e.target.value;
                                  setParsedClients(updated);
                                }}
                                className="w-full bg-transparent border-b border-transparent focus:border-blue-300 outline-none font-bold text-slate-800"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={client.cedula || ""}
                                onChange={(e) => {
                                  const updated = [...parsedClients];
                                  updated[idx].cedula = e.target.value;
                                  setParsedClients(updated);
                                }}
                                className="w-full bg-transparent border-b border-transparent focus:border-blue-300 outline-none text-slate-600"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={client.phone || ""}
                                onChange={(e) => {
                                  const updated = [...parsedClients];
                                  updated[idx].phone = e.target.value;
                                  setParsedClients(updated);
                                }}
                                className="w-full bg-transparent border-b border-transparent focus:border-blue-300 outline-none text-slate-600"
                              />
                            </td>
                            <td className="p-3 font-extrabold text-blue-600">
                              <input
                                type="number"
                                step="any"
                                value={client.debt || 0}
                                onChange={(e) => {
                                  const updated = [...parsedClients];
                                  updated[idx].debt = parseFloat(e.target.value) || 0;
                                  setParsedClients(updated);
                                }}
                                className="w-20 bg-transparent border-b border-transparent focus:border-blue-300 outline-none text-slate-800 font-extrabold"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={client.debtDetails || ""}
                                onChange={(e) => {
                                  const updated = [...parsedClients];
                                  updated[idx].debtDetails = e.target.value;
                                  setParsedClients(updated);
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

              {parseError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 animate-fade-in">
                  {parseError}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100 flex-shrink-0">
              {parsedClients.length > 0 ? (
                <button
                  onClick={() => setParsedClients([])}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 uppercase"
                >
                  Volver a cargar
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Powered by Gemini AI Studio ⚡</span>
              )}

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBulkUpload(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 uppercase"
                >
                  Cancelar
                </button>

                {parsedClients.length === 0 ? (
                  <button
                    onClick={handleParseWithGemini}
                    disabled={isParsing || (!bulkText && !fileBase64)}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md flex items-center space-x-2"
                  >
                    {isParsing ? (
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
                    onClick={handleConfirmImport}
                    disabled={isImporting || !selectedParsedClients.some(v => v)}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-300 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md flex items-center space-x-2"
                  >
                    {isImporting ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Importando lote...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Importar Seleccionados ({selectedParsedClients.filter(v => v).length})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK EDIT CUSTOMERS MODAL */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[80] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-5xl p-6 shadow-2xl relative border border-slate-100 space-y-6 animate-fade-in my-8 max-h-[90vh] flex flex-col animate-fade-in">
            <button
              onClick={() => setShowBulkEditModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1.5 flex-shrink-0">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Modificación Masiva de Clientes</span>
              </h3>
              <p className="text-xs text-slate-500">
                Estás editando {bulkEditCustomers.length} clientes simultáneamente. Modifica sus datos en la siguiente tabla y presiona "Guardar Cambios Masivos" para actualizar todos sus registros de ventas históricos de forma automática.
              </p>
            </div>

            {/* Quick action helper inside modal */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 flex-shrink-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Acción Rápida: Aplicar el mismo valor a todos los seleccionados</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="quickAddress"
                    placeholder="Escribir dirección para todos..."
                    className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = (document.getElementById("quickAddress") as HTMLInputElement)?.value || "";
                      if (!val) return;
                      setBulkEditCustomers(prev => prev.map(c => ({ ...c, address: val })));
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[10px] uppercase rounded-lg"
                  >
                    Aplicar
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="quickEmail"
                    placeholder="Escribir correo para todos..."
                    className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = (document.getElementById("quickEmail") as HTMLInputElement)?.value || "";
                      if (!val) return;
                      setBulkEditCustomers(prev => prev.map(c => ({ ...c, email: val })));
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
                      <th className="p-3">Nombre Completo</th>
                      <th className="p-3">Identificación / Cédula</th>
                      <th className="p-3">Teléfono</th>
                      <th className="p-3">Dirección</th>
                      <th className="p-3">Correo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bulkEditCustomers.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2">
                          <input
                            type="text"
                            value={c.name}
                            onChange={(e) => {
                              const updated = [...bulkEditCustomers];
                              updated[idx].name = e.target.value;
                              setBulkEditCustomers(updated);
                            }}
                            className="w-full p-1.5 bg-slate-50 border border-transparent focus:border-blue-300 focus:bg-white rounded outline-none font-bold text-slate-800"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={c.cedula}
                            onChange={(e) => {
                              const updated = [...bulkEditCustomers];
                              updated[idx].cedula = e.target.value;
                              setBulkEditCustomers(updated);
                            }}
                            className="w-full p-1.5 bg-slate-50 border border-transparent focus:border-blue-300 focus:bg-white rounded outline-none font-mono text-slate-600"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={c.phone}
                            onChange={(e) => {
                              const updated = [...bulkEditCustomers];
                              updated[idx].phone = e.target.value;
                              setBulkEditCustomers(updated);
                            }}
                            className="w-full p-1.5 bg-slate-50 border border-transparent focus:border-blue-300 focus:bg-white rounded outline-none text-slate-600"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={c.address}
                            onChange={(e) => {
                              const updated = [...bulkEditCustomers];
                              updated[idx].address = e.target.value;
                              setBulkEditCustomers(updated);
                            }}
                            className="w-full p-1.5 bg-slate-50 border border-transparent focus:border-blue-300 focus:bg-white rounded outline-none text-slate-600"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={c.email}
                            onChange={(e) => {
                              const updated = [...bulkEditCustomers];
                              updated[idx].email = e.target.value;
                              setBulkEditCustomers(updated);
                            }}
                            className="w-full p-1.5 bg-slate-50 border border-transparent focus:border-blue-300 focus:bg-white rounded outline-none text-slate-600"
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
                onClick={() => setShowBulkEditModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveBulkEdit}
                disabled={isSavingBulkEdit}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md flex items-center space-x-2"
              >
                {isSavingBulkEdit ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Guardando cambios...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
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

      {/* Customer Receipt / Invoice Modal */}
      {selectedReceiptSale && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[90] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative border border-slate-100 space-y-6 my-auto max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setSelectedReceiptSale(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Receipt Content */}
            <div ref={receiptRef} className="border-2 border-slate-100 rounded-2xl p-5 space-y-4 bg-white">
              <div className="flex flex-col items-center text-center space-y-2">
                <img
                  src={logoImg}
                  alt="SinGlutenpzo - Oriven Logo"
                  className="w-16 h-16 rounded-xl object-contain shadow-sm border border-emerald-100 bg-white p-1"
                />
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-amber-950 tracking-wider">SinGlutenpzo</h4>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-emerald-700">Oriven Distribuidora de Alimentos J-40633400-6</p>
                  <p className="text-[10px] text-slate-500 font-medium">Puerto Ordaz, Estado Bolívar</p>
                </div>
              </div>

              <div className="border-t border-b border-dashed border-slate-200 py-3 text-[10px] font-bold text-slate-500 space-y-1.5">
                <div className="flex justify-between">
                  <div>
                    <p>CLIENTE: <span className="text-slate-800 font-extrabold">{selectedReceiptSale.customerName}</span></p>
                    <p>TELÉFONO: <span className="text-slate-800 font-extrabold">{selectedReceiptSale.customerPhone}</span></p>
                    <p>CÉDULA: <span className="text-slate-800 font-extrabold">{selectedReceiptSale.customerCedula || "N/A"}</span></p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p>FACTURA/RECIBO: <span className="text-slate-800 font-extrabold">#{selectedReceiptSale.invoiceNumber || "000001"}</span></p>
                    <p>Nº CONTROL: <span className="text-slate-800 font-extrabold">#{selectedReceiptSale.controlNumber || selectedReceiptSale.invoiceNumber || "000001"}</span></p>
                    <p>FECHA: <span className="text-slate-800 font-extrabold">{selectedReceiptSale.date}</span></p>
                  </div>
                </div>
                <div className="border-t border-slate-200/50 pt-1.5">
                  <p>DIRECCIÓN: <span className="text-slate-800 font-extrabold">{selectedReceiptSale.customerAddress || "N/A"}</span></p>
                </div>
                {selectedReceiptSale.paymentPeriodicity && selectedReceiptSale.remainingAmount !== undefined && selectedReceiptSale.remainingAmount > 0 && (
                  <div className="border-t border-slate-200/50 pt-1.5 text-blue-600 font-extrabold uppercase">
                    <p>PLAN DE COBRO: <span className="font-black text-slate-800">{selectedReceiptSale.paymentPeriodicity}</span></p>
                    {selectedReceiptSale.specificPaymentDate && (
                      <p>FECHA LÍMITE: <span className="font-black text-rose-600">{selectedReceiptSale.specificPaymentDate}</span></p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                  <span>Concepto</span>
                  <div className="space-x-8">
                    <span>Cant</span>
                    <span>Total</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span className="break-words max-w-[200px]">{selectedReceiptSale.productName}</span>
                  <div className="space-x-12 flex">
                    <span>{selectedReceiptSale.quantity}</span>
                    <span className="font-extrabold text-blue-950">${(selectedReceiptSale.salePrice * selectedReceiptSale.quantity).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200/80 pt-3 flex flex-col space-y-1.5">
                <div className="flex justify-between w-full text-xs font-bold text-slate-500">
                  <span>Método de Pago:</span>
                  <span className="text-slate-800 font-extrabold">{selectedReceiptSale.paymentMethod}</span>
                </div>
                <div className="flex justify-between w-full text-xs font-bold text-slate-500">
                  <span>Condición:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold ${
                    selectedReceiptSale.status === "pendiente" || (selectedReceiptSale.remainingAmount !== undefined && selectedReceiptSale.remainingAmount > 0)
                      ? "bg-amber-100 text-amber-700 border border-amber-200"
                      : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  }`}>
                    {selectedReceiptSale.status === "pendiente" || (selectedReceiptSale.remainingAmount !== undefined && selectedReceiptSale.remainingAmount > 0)
                      ? "Crédito / Pendiente"
                      : "Contado / Pagado"}
                  </span>
                </div>
                
                <div className="border-t border-slate-100 pt-2 flex flex-col space-y-1">
                  <div className="flex justify-between w-full text-xs font-bold text-slate-500">
                    <span>Monto Total:</span>
                    <span className="text-slate-900 font-extrabold">${(selectedReceiptSale.salePrice * selectedReceiptSale.quantity).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between w-full text-xs font-bold text-emerald-600">
                    <span>Monto Pagado (Totalizado):</span>
                    <span className="font-extrabold">${(selectedReceiptSale.paidAmount !== undefined ? selectedReceiptSale.paidAmount : (selectedReceiptSale.salePrice * selectedReceiptSale.quantity)).toLocaleString()}</span>
                  </div>
                  {(() => {
                    const abonosTotal = (selectedReceiptSale.abonos || []).reduce((acc, a) => acc + a.amount, 0);
                    const totalSale = selectedReceiptSale.salePrice * selectedReceiptSale.quantity;
                    const initPayAmt = selectedReceiptSale.initialPaymentAmount !== undefined 
                      ? selectedReceiptSale.initialPaymentAmount 
                      : Math.max(0, (selectedReceiptSale.paidAmount || 0) - abonosTotal);
                    const initPayPct = selectedReceiptSale.initialPaymentPercentage !== undefined 
                      ? selectedReceiptSale.initialPaymentPercentage 
                      : (totalSale > 0 ? (initPayAmt / totalSale) * 100 : 0);

                    const origInstallments = selectedReceiptSale.installmentsCount || 1;
                    const abonosCount = (selectedReceiptSale.abonos || []).length;
                    const remainingInstallmentsCount = Math.max(0, origInstallments - abonosCount);
                    
                    const creditDebt = totalSale - initPayAmt;
                    const originalCuotaAmt = origInstallments > 0 ? creditDebt / origInstallments : 0;
                    const remaining = selectedReceiptSale.remainingAmount !== undefined ? selectedReceiptSale.remainingAmount : 0;
                    const cuotaRestanteAmt = remainingInstallmentsCount > 0 ? remaining / remainingInstallmentsCount : 0;

                    return (
                      <div className="border-t border-slate-100 pt-1.5 mt-1 space-y-1 text-[11px] text-slate-500 font-bold">
                        <div className="flex justify-between w-full">
                          <span>Abono Inicial (Inicial):</span>
                          <span className="text-blue-600 font-extrabold">${initPayAmt.toLocaleString()} ({initPayPct.toFixed(1)}%)</span>
                        </div>
                        {remaining > 0 && (
                          <div className="border-t border-slate-100 pt-1 space-y-1">
                            <div className="flex justify-between">
                              <span>Plan Original:</span>
                              <span className="text-slate-700 font-extrabold">{origInstallments} cuotas de ${originalCuotaAmt.toLocaleString()} c/u</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cuotas Pendientes:</span>
                              <span className="text-rose-600 font-black">{remainingInstallmentsCount} cuotas de ${cuotaRestanteAmt.toLocaleString()} c/u</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {(selectedReceiptSale.status === "pendiente" || (selectedReceiptSale.remainingAmount !== undefined && selectedReceiptSale.remainingAmount > 0)) && (
                    <div className="flex justify-between w-full text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 mt-1">
                      <span>Restante por Pagar:</span>
                      <span className="font-black">${(selectedReceiptSale.remainingAmount || 0).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Abonos History inside Receipt */}
                {selectedReceiptSale.abonos && selectedReceiptSale.abonos.length > 0 && (
                  <div className="border-t border-slate-100 pt-2.5 mt-2 space-y-1.5 text-[10px] font-bold text-slate-500">
                    <p className="text-blue-600 uppercase tracking-wider text-[9px] font-black">Historial de Abonos Recibidos:</p>
                    <div className="bg-slate-100/50 p-2 rounded-xl border border-slate-100 space-y-1 max-h-[80px] overflow-y-auto">
                      {selectedReceiptSale.abonos.map((ab, idx) => (
                        <div key={idx} className="flex justify-between text-slate-600">
                          <span>{ab.date} ({ab.paymentMethod}):</span>
                          <span className="text-slate-800 font-extrabold">+${ab.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center text-[10px] font-bold text-amber-700 pt-2 border-t border-dashed border-slate-200">
                ¡Gracias por su confianza en SinGlutenpzo (Oriven Distribuidora de Alimentos)!
              </div>
            </div>

            <div className="flex flex-col sm:flex-wrap sm:flex-row gap-2 justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedReceiptSale(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 uppercase w-full sm:w-auto"
              >
                Cerrar
              </button>
              {selectedReceiptSale.customerEmail && (
                <button
                  onClick={() => handleSendEmailOnDemand(selectedReceiptSale)}
                  disabled={isSendingEmail}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 disabled:bg-blue-100/50 disabled:text-blue-400 border border-blue-200 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 w-full sm:w-auto animate-fade-in"
                >
                  <Mail className="h-4 w-4" />
                  <span>{isSendingEmail ? "Enviando..." : "Correo"}</span>
                </button>
              )}
              <button
                onClick={handleShareReceiptImage}
                disabled={isGeneratingImage}
                title="Enviar o compartir el recibo en formato de imagen PNG"
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-md hover:shadow-lg transition-all w-full sm:w-auto disabled:opacity-50"
              >
                <Camera className="h-4 w-4" />
                <span>{isGeneratingImage ? "Generando..." : "Enviar Imagen"}</span>
              </button>
              <button
                onClick={handleDownloadReceiptImage}
                disabled={isGeneratingImage}
                title="Descargar la imagen del recibo PNG en tu dispositivo"
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-md hover:shadow-lg transition-all w-full sm:w-auto disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span>Descargar PNG</span>
              </button>
              <button
                onClick={() => handleShareWhatsApp(selectedReceiptSale)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Texto WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
