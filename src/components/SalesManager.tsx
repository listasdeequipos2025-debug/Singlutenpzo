import React, { useState, useRef } from "react";
import html2canvas from "html2canvas";
import { Product, Sale, ProductCategory } from "../types";
import {
  ShoppingCart, Search, Plus, Calendar, User, Phone, CreditCard,
  FileText, ArrowDownRight, Eye, CheckCircle2, AlertTriangle, AlertCircle, X, MapPin, Mail,
  MessageSquare, Share2, Trash2, Edit, Download, Heart, Sparkles, Image as ImageIcon, Camera
} from "lucide-react";
import * as XLSX from "xlsx";
import logoImg from "../assets/images/singlutenpzo_logo_1785767632220.jpg";

interface SalesManagerProps {
  products: Product[];
  sales: Sale[];
  onRegisterSale: (sale: Omit<Sale, "id" | "createdAt">) => Promise<string>;
  onUpdateSaleDebt?: (saleId: string, paidIncrement: number, paymentMethod?: string, paymentDate?: string) => Promise<void>;
  onDeleteSale?: (id: string) => Promise<void>;
  onEditSale?: (id: string, updates: Partial<Sale>) => Promise<void>;
}

export default function SalesManager({
  products,
  sales,
  onRegisterSale,
  onUpdateSaleDebt,
  onDeleteSale,
  onEditSale
}: SalesManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "equipos" | "accesorios">("all");
  const [currentSection, setCurrentSection] = useState<"historial" | "deudores">("historial");

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
  const [priceType, setPriceType] = useState<"detal" | "mayor" | "credito">("detal");
  const [salePriceInput, setSalePriceInput] = useState("");
  const [referenceInput, setReferenceInput] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCedulaPrefix, setCustomerCedulaPrefix] = useState("V");
  const [customerCedulaNumber, setCustomerCedulaNumber] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [paymentType, setPaymentType] = useState<"completo" | "parcial">("completo");
  const [paidAmountInput, setPaidAmountInput] = useState("");
  const [paymentPeriodicity, setPaymentPeriodicity] = useState("semanal");
  const [specificPaymentDate, setSpecificPaymentDate] = useState("");
  const [installmentsCount, setInstallmentsCount] = useState("1");
  const [formError, setFormError] = useState("");

  // Unique registered clients extracted from sales history
  const uniqueClients = React.useMemo(() => {
    const map = new Map<string, {
      name: string;
      cedula: string;
      phone: string;
      address: string;
      email: string;
    }>();

    sales.forEach((s) => {
      if (!s.customerName || s.customerName.trim() === "" || s.customerName === "Cliente General") return;
      const nameNorm = s.customerName.trim();
      const cedulaNorm = (s.customerCedula || "").trim();
      const cleanCed = cedulaNorm.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const key = cleanCed && cleanCed !== "NA" ? `ced_${cleanCed}` : `name_${nameNorm.toLowerCase()}`;

      if (!map.has(key)) {
        map.set(key, {
          name: nameNorm,
          cedula: cedulaNorm || "N/A",
          phone: s.customerPhone && s.customerPhone !== "N/A" ? s.customerPhone : "",
          address: s.customerAddress && s.customerAddress !== "N/A" ? s.customerAddress : "",
          email: s.customerEmail || ""
        });
      } else {
        const item = map.get(key)!;
        if ((!item.phone || item.phone === "N/A") && s.customerPhone && s.customerPhone !== "N/A") {
          item.phone = s.customerPhone;
        }
        if ((!item.address || item.address === "N/A") && s.customerAddress && s.customerAddress !== "N/A") {
          item.address = s.customerAddress;
        }
        if (!item.email && s.customerEmail) {
          item.email = s.customerEmail;
        }
        if ((item.cedula === "N/A" || !item.cedula) && s.customerCedula && s.customerCedula !== "N/A") {
          item.cedula = s.customerCedula;
        }
      }
    });

    return Array.from(map.values());
  }, [sales]);

  // Detected matching client based on current input name or cedula
  const matchedClient = React.useMemo(() => {
    const trimmedName = customerName.trim().toLowerCase();
    const typedCed = customerCedulaNumber.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (!trimmedName && !typedCed) return null;

    return uniqueClients.find((c) => {
      const cCleanCed = (c.cedula || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (typedCed && typedCed.length >= 3 && cCleanCed.includes(typedCed)) return true;
      if (trimmedName && trimmedName.length >= 2 && c.name.toLowerCase().includes(trimmedName)) return true;
      return false;
    }) || null;
  }, [customerName, customerCedulaNumber, uniqueClients]);

  const applyClientData = (client: { name: string; cedula: string; phone: string; address: string; email: string }) => {
    setCustomerName(client.name);
    if (client.phone && client.phone !== "N/A") setCustomerPhone(client.phone);
    if (client.address && client.address !== "N/A") setCustomerAddress(client.address);
    if (client.email) setCustomerEmail(client.email);

    if (client.cedula && client.cedula !== "N/A") {
      const parts = client.cedula.split("-");
      if (parts.length === 2) {
        setCustomerCedulaPrefix(parts[0]);
        setCustomerCedulaNumber(parts[1]);
      } else {
        const firstChar = client.cedula.charAt(0).toUpperCase();
        if (["V", "E", "J", "G", "P"].includes(firstChar)) {
          setCustomerCedulaPrefix(firstChar);
          setCustomerCedulaNumber(client.cedula.substring(1).replace(/[^0-9]/g, ""));
        } else {
          setCustomerCedulaNumber(client.cedula.replace(/[^0-9]/g, ""));
        }
      }
    }
  };

  // Receipt Modal state & Image Ref
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<Sale | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Abono (Repayment) Modal states
  const [selectedAbonoSale, setSelectedAbonoSale] = useState<Sale | null>(null);
  const [abonoAmount, setAbonoAmount] = useState("");
  const [abonoPaymentMethod, setAbonoPaymentMethod] = useState("Efectivo");
  const [abonoDate, setAbonoDate] = useState("");
  const [abonoError, setAbonoError] = useState("");
  const [isSubmittingAbono, setIsSubmittingAbono] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Edit Sale Modal states
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editProductName, setEditProductName] = useState("");
  const [editProductId, setEditProductId] = useState("");
  const [editProductCategory, setEditProductCategory] = useState<ProductCategory>(ProductCategory.Equipos);
  const [editQuantity, setEditQuantity] = useState("1");
  const [editSalePrice, setEditSalePrice] = useState("0");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editCustomerCedula, setEditCustomerCedula] = useState("");
  const [editCustomerAddress, setEditCustomerAddress] = useState("");
  const [editCustomerEmail, setEditCustomerEmail] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("Efectivo");
  const [editPaidAmount, setEditPaidAmount] = useState("0");
  const [editPaymentPeriodicity, setEditPaymentPeriodicity] = useState("semanal");
  const [editSpecificPaymentDate, setEditSpecificPaymentDate] = useState("");
  const [editInstallmentsCount, setEditInstallmentsCount] = useState("1");
  const [editDate, setEditDate] = useState("");
  const [editFormError, setEditFormError] = useState("");

  const handleOpenEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setEditProductId(sale.productId || "");
    setEditProductName(sale.productName || "");
    setEditProductCategory(sale.category || ProductCategory.Equipos);
    setEditQuantity(String(sale.quantity || 1));
    setEditSalePrice(String(sale.salePrice || 0));
    setEditCustomerName(sale.customerName || "");
    setEditCustomerPhone(sale.customerPhone || "");
    setEditCustomerCedula(sale.customerCedula || "");
    setEditCustomerAddress(sale.customerAddress || "");
    setEditCustomerEmail(sale.customerEmail || "");
    setEditPaymentMethod(sale.paymentMethod || "Efectivo");
    setEditPaidAmount(String(sale.paidAmount !== undefined ? sale.paidAmount : (sale.salePrice * sale.quantity)));
    setEditPaymentPeriodicity(sale.paymentPeriodicity || "semanal");
    setEditSpecificPaymentDate(sale.specificPaymentDate || "");
    setEditInstallmentsCount(String(sale.installmentsCount || 1));
    setEditDate(sale.date || "");
    setEditFormError("");
  };

  const handleEditSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale || !onEditSale) return;

    const qty = parseInt(editQuantity, 10);
    const price = parseFloat(editSalePrice);
    const paid = parseFloat(editPaidAmount);

    if (isNaN(qty) || qty <= 0) {
      setEditFormError("La cantidad debe ser mayor a 0");
      return;
    }
    if (isNaN(price) || price < 0) {
      setEditFormError("El precio de venta no puede ser negativo");
      return;
    }
    if (isNaN(paid) || paid < 0) {
      setEditFormError("El monto pagado no puede ser negativo");
      return;
    }

    const total = price * qty;
    if (paid > total) {
      setEditFormError(`El monto pagado ($${paid}) no puede ser mayor al total de la venta ($${total})`);
      return;
    }

    const matchedProduct = products.find(p => p.id === editProductId);
    const cost = matchedProduct ? (matchedProduct.costPrice || 0) : 0;
    const profit = (price - cost) * qty;

    const remaining = total - paid;
    const statusVal = remaining === 0 ? "pagado" : "pendiente";

    const updates: Partial<Sale> = {
      productId: editProductId,
      productName: matchedProduct ? matchedProduct.name : editProductName,
      category: editProductCategory,
      quantity: qty,
      salePrice: price,
      profit: profit,
      customerName: editCustomerName.trim(),
      customerPhone: editCustomerPhone.trim(),
      customerCedula: editCustomerCedula.trim(),
      customerAddress: editCustomerAddress.trim(),
      customerEmail: editCustomerEmail.trim(),
      paymentMethod: editPaymentMethod,
      status: statusVal,
      paidAmount: paid,
      remainingAmount: remaining,
      paymentPeriodicity: editPaymentPeriodicity,
      specificPaymentDate: editSpecificPaymentDate || undefined,
      installmentsCount: statusVal === "pendiente" ? (parseInt(editInstallmentsCount, 10) || 1) : undefined,
      date: editDate
    };

    try {
      await onEditSale(editingSale.id, updates);
      setEditingSale(null);
    } catch (err: any) {
      setEditFormError(err.message || "Error al actualizar la venta");
    }
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
      `🧾 *Recibo:* #${receiptId}\n` +
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

  const handleDownloadReceiptImage = async () => {
    if (!receiptRef.current || !selectedReceiptSale) return;
    setIsGeneratingImage(true);
    try {
      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(receiptRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          imageTimeout: 15000,
          onclone: (clonedDoc, clonedElement) => {
            const clamped = clonedElement.querySelectorAll('[class*="line-clamp"]');
            clamped.forEach((el) => {
              (el as HTMLElement).style.display = 'block';
              (el as HTMLElement).style.overflow = 'visible';
              (el as HTMLElement).style.webkitLineClamp = 'none';
            });
            const scrollables = clonedElement.querySelectorAll('.overflow-y-auto, [class*="max-h-"]');
            scrollables.forEach((el) => {
              (el as HTMLElement).style.maxHeight = 'none';
              (el as HTMLElement).style.overflow = 'visible';
            });
            clonedElement.style.backgroundColor = '#ffffff';
          }
        });
      } catch (firstErr) {
        console.warn("Retrying html2canvas with scale 1 fallback:", firstErr);
        canvas = await html2canvas(receiptRef.current, {
          scale: 1,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          foreignObjectRendering: false
        });
      }

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `Recibo_Venta_${selectedReceiptSale.invoiceNumber || "000001"}_${(selectedReceiptSale.customerName || "Cliente").replace(/[^a-zA-Z0-9]/g, "_")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error al descargar la imagen del recibo:", err);
      alert("No se pudo generar la imagen del recibo en este dispositivo. Por favor intenta tomar una captura de pantalla del recibo.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleShareReceiptImage = async () => {
    if (!receiptRef.current || !selectedReceiptSale) return;
    setIsGeneratingImage(true);
    try {
      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(receiptRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          imageTimeout: 15000,
          onclone: (clonedDoc, clonedElement) => {
            const clamped = clonedElement.querySelectorAll('[class*="line-clamp"]');
            clamped.forEach((el) => {
              (el as HTMLElement).style.display = 'block';
              (el as HTMLElement).style.overflow = 'visible';
              (el as HTMLElement).style.webkitLineClamp = 'none';
            });
            const scrollables = clonedElement.querySelectorAll('.overflow-y-auto, [class*="max-h-"]');
            scrollables.forEach((el) => {
              (el as HTMLElement).style.maxHeight = 'none';
              (el as HTMLElement).style.overflow = 'visible';
            });
            clonedElement.style.backgroundColor = '#ffffff';
          }
        });
      } catch (firstErr) {
        console.warn("Retrying html2canvas with scale 1 fallback:", firstErr);
        canvas = await html2canvas(receiptRef.current, {
          scale: 1,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          foreignObjectRendering: false
        });
      }

      canvas.toBlob(async (blob) => {
        setIsGeneratingImage(false);
        if (!blob) {
          handleShareWhatsApp(selectedReceiptSale);
          return;
        }

        const fileName = `Recibo_${selectedReceiptSale.invoiceNumber || "000001"}.png`;
        const file = new File([blob], fileName, { type: "image/png" });

        // If Web Share API with files is supported (mobile browsers)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Recibo #${selectedReceiptSale.invoiceNumber || "000001"} - SinGlutenpzo`,
              text: `Estimado(a) ${selectedReceiptSale.customerName}, le adjuntamos su Recibo de Venta. ¡Muchas gracias por su preferencia!`,
            });
            return;
          } catch (e) {
            console.log("Web share falló o fue cancelado por el usuario:", e);
          }
        }

        // Desktop / Browser Fallback: Copy image to Clipboard & Download PNG
        let imageCopied = false;
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob })
            ]);
            imageCopied = true;
          }
        } catch (clipErr) {
          console.log("No se pudo copiar directamente al portapapeles:", clipErr);
        }

        // Download PNG file to device
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Open WhatsApp chat
        handleShareWhatsApp(selectedReceiptSale);

        // Alert user
        if (imageCopied) {
          alert("📸 ¡Imagen del recibo generada y copiada al portapapeles!\n\n1. La imagen se ha guardado en tus descargas.\n2. Se ha abierto WhatsApp. En el chat del cliente, presiona Pegar (Ctrl + V) para enviar la imagen.");
        } else {
          alert("📸 ¡Imagen del recibo descargada a tu equipo!\n\n1. Se ha abierto el chat de WhatsApp del cliente.\n2. Haz clic en el icono de adjuntar (clip) en WhatsApp y selecciona la imagen descargada '" + fileName + "'.");
        }
      }, "image/png");
    } catch (err) {
      console.error("Error al preparar la imagen:", err);
      setIsGeneratingImage(false);
      alert("No se pudo generar la imagen del recibo. Abriendo texto para WhatsApp.");
      handleShareWhatsApp(selectedReceiptSale);
    }
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
      `Ha sido un verdadero placer atenderle. Le recordamos que elaboramos y distribuimos productos libres de gluten, harinas nutritivas alternativas y postres saludables de la más alta calidad.\n\n` +
      `✨ *Estamos completamente a su orden para su próximo pedido.* ¡Que tenga un feliz y bendecido día! 🌾📦`;

    const url = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleSendEmailOnDemand = async (sale: Sale) => {
    if (!sale.customerEmail) {
      alert("Este cliente no posee un correo electrónico registrado.");
      return;
    }
    setIsSendingEmail(true);
    try {
      const response = await fetch("/api/send-invoice-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: sale.customerEmail,
          customerName: sale.customerName || "Cliente General",
          customerPhone: sale.customerPhone || "N/A",
          customerCedula: sale.customerCedula || "N/A",
          customerAddress: sale.customerAddress || "N/A",
          invoiceId: sale.invoiceNumber || "000001",
          productName: sale.productName,
          quantity: sale.quantity,
          salePrice: sale.salePrice,
          paymentMethod: sale.paymentMethod,
          totalAmount: sale.salePrice * sale.quantity,
          paidAmount: sale.paidAmount !== undefined ? sale.paidAmount : (sale.salePrice * sale.quantity),
          remainingAmount: sale.remainingAmount !== undefined ? sale.remainingAmount : 0,
          paymentPeriodicity: sale.paymentPeriodicity || "semanal",
          status: sale.status,
          date: sale.date,
          abonos: sale.abonos || []
        })
      });
      const result = await response.json();
      if (result.success) {
        if (result.isEthereal && result.etherealUrl) {
          alert(`[Simulación] Factura enviada al correo del cliente. Puedes verla aquí:\n${result.etherealUrl}`);
        } else {
          alert("Factura enviada exitosamente por correo electrónico.");
        }
      } else {
        alert("Error al enviar la factura por correo: " + result.error);
      }
    } catch (err: any) {
      alert("Error de red al enviar el correo: " + (err.message || err));
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Filter sales based on section
  const filteredSales = sales.filter((s) => {
    // Basic filters
    const matchesSearch = s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.customerCedula && s.customerCedula.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
    
    // Section filters
    if (currentSection === "deudores") {
      const isPending = s.status === "pendiente" || (s.remainingAmount !== undefined && s.remainingAmount > 0);
      return matchesSearch && matchesCategory && isPending;
    }
    
    return matchesSearch && matchesCategory;
  });

  // Calculate fields for chosen product
  const chosenProduct = products.find((p) => p.id === selectedProductId);

  // When chosenProduct or priceType changes, update salePriceInput
  React.useEffect(() => {
    if (chosenProduct) {
      if (priceType === "detal") {
        setSalePriceInput(String(chosenProduct.salePrice || 0));
      } else if (priceType === "mayor") {
        setSalePriceInput(String(chosenProduct.wholesalePrice || chosenProduct.salePrice || 0));
      } else if (priceType === "credito") {
        setSalePriceInput(String(chosenProduct.creditPrice || chosenProduct.salePrice || 0));
      }
    } else {
      setSalePriceInput("");
    }
  }, [selectedProductId, priceType, products]);

  const parsedSalePrice = parseFloat(salePriceInput) || (chosenProduct ? chosenProduct.salePrice : 0);
  const totalSaleAmount = parsedSalePrice * parseInt(quantity || "0", 10);

  const handleRegisterSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!selectedProductId) {
      setFormError("Por favor, selecciona un producto.");
      return;
    }

    if (!chosenProduct) {
      setFormError("El producto seleccionado no es válido.");
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setFormError("La cantidad debe ser mayor que cero.");
      return;
    }

    const finalSalePrice = parseFloat(salePriceInput);
    if (isNaN(finalSalePrice) || finalSalePrice <= 0) {
      setFormError("Por favor, ingresa un precio de venta válido mayor a cero.");
      return;
    }

    const total = finalSalePrice * qty;
    let paid = total;
    let remaining = 0;
    let status: "pagado" | "pendiente" = "pagado";

    if (paymentType === "parcial") {
      const parsedPaid = parseFloat(paidAmountInput);
      if (isNaN(parsedPaid) || parsedPaid < 0) {
        setFormError("El monto pagado debe ser un número válido mayor o igual a cero.");
        return;
      }
      if (parsedPaid > total) {
        setFormError(`El monto pagado ($${parsedPaid}) no puede superar el total de la venta ($${total}).`);
        return;
      }
      paid = parsedPaid;
      remaining = total - paid;
      status = remaining === 0 ? "pagado" : "pendiente";
    }

    // Profit logic:
    // If they filled the referenceInput, profit = referenceInput * qty
    // If not, profit = (finalSalePrice - costPrice) * qty
    let profit = 0;
    const refVal = parseFloat(referenceInput);
    if (!isNaN(refVal)) {
      profit = refVal * qty;
    } else if (chosenProduct.costPrice !== undefined) {
      profit = (finalSalePrice - chosenProduct.costPrice) * qty;
    } else {
      profit = (chosenProduct.referenceProfit || 0) * qty;
    }

    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const monthStr = todayStr.substring(0, 7); // YYYY-MM

    // Determine normalized customer details based on matched registered client
    const enteredCedula = customerCedulaNumber.trim() ? `${customerCedulaPrefix}-${customerCedulaNumber.trim()}` : "N/A";
    const finalCustomerName = matchedClient ? matchedClient.name : (customerName.trim() || "Cliente General");
    const finalCustomerCedula = matchedClient && matchedClient.cedula !== "N/A" ? matchedClient.cedula : enteredCedula;
    const finalCustomerPhone = customerPhone.trim() && customerPhone.trim() !== "N/A" ? customerPhone.trim() : (matchedClient?.phone || "N/A");
    const finalCustomerAddress = customerAddress.trim() && customerAddress.trim() !== "N/A" ? customerAddress.trim() : (matchedClient?.address || "N/A");
    const finalCustomerEmail = customerEmail.trim() ? customerEmail.trim() : (matchedClient?.email || "");

    const saleData = {
      productId: chosenProduct.id,
      productName: chosenProduct.name,
      category: chosenProduct.category,
      quantity: qty,
      salePrice: finalSalePrice,
      costPrice: chosenProduct.costPrice || 0,
      profit: profit,
      reference: !isNaN(refVal) ? refVal : undefined,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      customerCedula: finalCustomerCedula,
      customerAddress: finalCustomerAddress,
      customerEmail: finalCustomerEmail,
      paymentPeriodicity: status === "pendiente" ? paymentPeriodicity : undefined,
      specificPaymentDate: (status === "pendiente" && paymentPeriodicity === "especifico") ? specificPaymentDate : undefined,
      installmentsCount: status === "pendiente" ? (parseInt(installmentsCount, 10) || 1) : undefined,
      initialPaymentAmount: paid,
      initialPaymentPercentage: total > 0 ? (paid / total) * 100 : 100,
      date: todayStr,
      month: monthStr,
      paymentMethod,
      paidAmount: paid,
      remainingAmount: remaining,
      status: status,
      abonos: [] // Initial empty abonos list
    };

    try {
      const addedId = await onRegisterSale(saleData);
      
      // Auto-open detailed receipt/invoice modal
      setSelectedReceiptSale({
        id: addedId,
        createdAt: new Date().toISOString(),
        ...saleData
      });

      setShowForm(false);
      // Reset form fields
      setSelectedProductId("");
      setQuantity("1");
      setPriceType("detal");
      setSalePriceInput("");
      setReferenceInput("");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerCedulaPrefix("V");
      setCustomerCedulaNumber("");
      setCustomerAddress("");
      setCustomerEmail("");
      setPaymentMethod("Efectivo");
      setPaymentType("completo");
      setPaidAmountInput("");
      setPaymentPeriodicity("semanal");
      setSpecificPaymentDate("");
      setInstallmentsCount("1");
    } catch (err: any) {
      setFormError(err.message || "Error al registrar la venta.");
    }
  };

  const handleRegisterAbonoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAbonoError("");
    
    if (!selectedAbonoSale || !onUpdateSaleDebt) return;

    const abono = parseFloat(abonoAmount);
    const maxRemaining = selectedAbonoSale.remainingAmount !== undefined ? selectedAbonoSale.remainingAmount : 0;

    if (isNaN(abono) || abono <= 0) {
      setAbonoError("El abono debe ser un número mayor a cero.");
      return;
    }

    if (abono > maxRemaining) {
      setAbonoError(`El abono ($${abono}) no puede ser mayor que la deuda pendiente ($${maxRemaining}).`);
      return;
    }

    setIsSubmittingAbono(true);
    try {
      await onUpdateSaleDebt(selectedAbonoSale.id, abono, abonoPaymentMethod, abonoDate || undefined);
      setSelectedAbonoSale(null);
      setAbonoAmount("");
      setAbonoPaymentMethod("Efectivo");
      setAbonoDate("");
    } catch (err: any) {
      setAbonoError(err.message || "Error al registrar el abono.");
    } finally {
      setIsSubmittingAbono(false);
    }
  };

  const handleExportSalesToExcel = () => {
    const exportData = sales.map((s) => {
      return {
        "Nº Recibo / Factura": s.invoiceNumber || "000001",
        "Nº Control": s.controlNumber || s.invoiceNumber || "000001",
        "Fecha": s.date,
        "Producto": s.productName,
        "Categoría": s.category === "equipos" ? "Productos Sin Gluten" : "Postres Saludables",
        "Cantidad": s.quantity,
        "Precio Venta ($)": s.salePrice,
        "Precio Costo ($)": s.costPrice || 0,
        "Utilidad Bruta ($)": s.profit,
        "Referencia (Ganancia de Referencia) ($)": s.reference || "",
        "Cliente": s.customerName,
        "Cédula / RIF": s.customerCedula || "N/A",
        "Teléfono": s.customerPhone || "N/A",
        "Método de Pago": s.paymentMethod,
        "Monto Pagado ($)": s.paidAmount || 0,
        "Saldo Restante ($)": s.remainingAmount || 0,
        "Estado": s.status === "pagado" ? "Pagado" : "Pendiente"
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");

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

    XLSX.writeFile(workbook, "Reporte_Ventas_SinGlutenpzo.xlsx");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Registro de Ventas</h2>
          <p className="text-sm text-slate-500">Registra compras y emite recibos de pago con stock sincronizado</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportSalesToExcel}
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
            <span>Registrar una Venta</span>
          </button>
        </div>
      </div>

      {/* Sale Registration Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[80] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg p-4 sm:p-6 shadow-2xl relative border border-slate-100 my-auto max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
              <span>Registrar Venta de Productos o Postres</span>
            </h3>

            <form onSubmit={handleRegisterSaleSubmit} className="space-y-5">
              {/* Product Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Seleccionar Producto del Inventario</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none cursor-pointer"
                >
                  <option value="">-- Elige un artículo --</option>
                  {products
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (${p.salePrice.toLocaleString()} - Stock: {p.stock})
                      </option>
                    ))}
                </select>
              </div>

              {chosenProduct && (
                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between text-xs font-bold text-blue-900">
                  <div className="space-y-0.5">
                    <p>Categoría: <span className="capitalize text-slate-700">{chosenProduct.category}</span></p>
                    <p>Precio Unitario: <span className="text-blue-700">${chosenProduct.salePrice}</span></p>
                  </div>
                  <div className="text-right">
                    <p>Stock Disponible:</p>
                    <p className="text-base font-black text-blue-700">{chosenProduct.stock} uds.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Quantity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Cantidad</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none cursor-pointer"
                  >
                    <option value="Efectivo">Efectivo ($)</option>
                    <option value="Transferencia Zelle">Transferencia Zelle</option>
                    <option value="Pago Móvil">Pago Móvil</option>
                    <option value="Punto de Venta / Tarjeta">Punto de Venta / Tarjeta</option>
                  </select>
                </div>
              </div>

              {chosenProduct && (
                <div className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 animate-fade-in">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Estructura de Precio a Cobrar</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPriceType("detal")}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                          priceType === "detal"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        Detal (${chosenProduct.salePrice.toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriceType("mayor")}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                          priceType === "mayor"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        Mayor (${(chosenProduct.wholesalePrice ?? chosenProduct.salePrice).toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriceType("credito")}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                          priceType === "credito"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        Crédito (${(chosenProduct.creditPrice ?? chosenProduct.salePrice).toLocaleString()})
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Precio Unitario Facturado $</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={salePriceInput}
                        onChange={(e) => setSalePriceInput(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Ref. Ganancia Unitario $ (Opcional, Interno)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ej: 15"
                        value={referenceInput}
                        onChange={(e) => setReferenceInput(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-xs font-semibold transition-all outline-none"
                        title="Solo para uso interno. Si se deja vacío, la ganancia se calculará como (Precio Venta - Costo)."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Type Selection */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Condición de Pago</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentType("completo");
                        setPaidAmountInput("");
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                        paymentType === "completo"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      Pago Completo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentType("parcial");
                        setPaidAmountInput("");
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                        paymentType === "parcial"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      Crédito / Abono Parcial
                    </button>
                  </div>
                </div>

                {paymentType === "parcial" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 animate-fade-in">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Monto Recibido (Abono) $</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="Ej: 50"
                        value={paidAmountInput}
                        onChange={(e) => setPaidAmountInput(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                      />
                    </div>
                    {chosenProduct && (() => {
                      const parsedPaid = parseFloat(paidAmountInput) || 0;
                      const initialPercentage = totalSaleAmount > 0 ? (parsedPaid / totalSaleAmount) * 100 : 0;
                      return (
                        <div className="flex flex-col justify-center pb-1 text-xs font-semibold text-slate-500">
                          <p>Total Venta: <span className="font-extrabold text-slate-800">${totalSaleAmount.toLocaleString()}</span></p>
                          <p className="text-blue-600">
                            Inicial/Abono: <span className="font-extrabold text-blue-700">${parsedPaid.toLocaleString()} ({initialPercentage.toFixed(1)}% del total)</span>
                          </p>
                          <p className="text-rose-600">
                            Deuda Restante: <span className="font-bold">${Math.max(0, totalSaleAmount - parsedPaid).toLocaleString()}</span>
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Customer Details */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Datos del Cliente (Facturación)</p>
                  {uniqueClients.length > 0 && (
                    <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-100">
                      {uniqueClients.length} clientes en base de datos
                    </span>
                  )}
                </div>

                {/* Customer Auto-Recognition Banner */}
                {matchedClient && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-2 text-emerald-900 text-xs shadow-sm animate-fade-in">
                    <div className="flex items-center space-x-2 overflow-hidden">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <div className="truncate">
                        <span className="font-bold">✓ Cliente Registrado:</span>{" "}
                        <span className="font-extrabold text-emerald-800">{matchedClient.name}</span>{" "}
                        <span className="text-emerald-700 font-mono text-[11px]">({matchedClient.cedula})</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyClientData(matchedClient)}
                      className="flex-shrink-0 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition-all shadow-sm flex items-center space-x-1"
                    >
                      <span>Cargar Datos</span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center space-x-1">
                      <User className="h-3.5 w-3.5" />
                      <span>Nombre del Cliente</span>
                    </label>
                    <input
                      type="text"
                      required
                      list="registered-customers-list"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                    />
                    <datalist id="registered-customers-list">
                      {uniqueClients.map((c, idx) => (
                        <option key={idx} value={c.name}>{`${c.name} (${c.cedula})`}</option>
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center space-x-1">
                      <Phone className="h-3.5 w-3.5" />
                      <span>Teléfono</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Ej: 584121234567"
                      className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center space-x-1">
                      <FileText className="h-3.5 w-3.5" />
                      <span>Cédula / RIF / Pasaporte</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={customerCedulaPrefix}
                        onChange={(e) => setCustomerCedulaPrefix(e.target.value)}
                        className="w-20 p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-bold transition-all outline-none"
                      >
                        <option value="V">V</option>
                        <option value="E">E</option>
                        <option value="J">J</option>
                        <option value="G">G</option>
                        <option value="P">P</option>
                      </select>
                      <input
                        type="text"
                        required
                        value={customerCedulaNumber}
                        onChange={(e) => setCustomerCedulaNumber(e.target.value)}
                        placeholder="Ej: 12345678"
                        className="flex-1 p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center space-x-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Dirección de Habitación</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Ej: Av. Principal, Casa #12, Caracas"
                      className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center space-x-1">
                      <Mail className="h-3.5 w-3.5" />
                      <span>Correo Electrónico (Para Factura y Estado de Cuenta)</span>
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Ej: cliente@correo.com"
                      className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-medium transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Credit Specific details (Periodicity of cobro) */}
                {paymentType === "parcial" && (
                  <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 space-y-3.5 animate-fade-in">
                    <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider flex items-center space-x-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Configuración del Plan de Cobro</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Número de Cuotas</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={installmentsCount}
                          onChange={(e) => setInstallmentsCount(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 rounded-xl text-xs font-semibold outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Periodicidad de Pago</label>
                        <select
                          value={paymentPeriodicity}
                          onChange={(e) => setPaymentPeriodicity(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                        >
                          <option value="semanal">Semanal (Cada 7 días)</option>
                          <option value="quincenal">Quincenal (Cada 15 días)</option>
                          <option value="mensual">Mensual (Cada 30 días)</option>
                          <option value="especifico">Fecha Específica de Cobro</option>
                        </select>
                      </div>

                      {paymentPeriodicity === "especifico" && (
                        <div className="space-y-1 animate-fade-in col-span-1 sm:col-span-2 md:col-span-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha Límite de Cobro</label>
                          <input
                            type="date"
                            required
                            value={specificPaymentDate}
                            onChange={(e) => setSpecificPaymentDate(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 rounded-xl text-xs font-semibold outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {formError && (
                <div className="flex items-center space-x-2 bg-rose-50 border border-rose-100 text-rose-600 text-xs p-3 rounded-xl">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {chosenProduct && quantity && (
                <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-500">Monto Total de Venta:</span>
                  <span className="text-xl font-black text-blue-950">
                    ${(chosenProduct.salePrice * parseInt(quantity || "0", 10)).toLocaleString()}
                  </span>
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
                  Registrar Venta
                </button>
              </div>
            </form>
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
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
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
              {(!selectedReceiptSale.remainingAmount || selectedReceiptSale.remainingAmount === 0 || selectedReceiptSale.status === "pagado") && (
                <button
                  onClick={() => handleSendWhatsAppThankYou(selectedReceiptSale)}
                  title="Enviar mensaje de agradecimiento y quedamos a la orden para su nuevo pedido por WhatsApp"
                  className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-md hover:shadow-lg transition-all w-full sm:w-auto animate-fade-in"
                >
                  <Heart className="h-4 w-4 text-rose-200 fill-rose-200" />
                  <span>Agradecer</span>
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center space-x-1.5 w-full sm:w-auto"
              >
                <FileText className="h-4 w-4" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Abono (Repayment) Modal */}
      {selectedAbonoSale && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[90] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-sm p-4 sm:p-6 shadow-2xl relative border border-slate-100 space-y-6 my-auto max-h-[92vh] overflow-y-auto">
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
                Registrar un abono para la cuenta pendiente de <span className="font-extrabold text-slate-800">{selectedAbonoSale.customerName}</span>.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5 text-xs font-semibold text-slate-600">
              <p>Producto: <span className="text-slate-900 font-bold">{selectedAbonoSale.productName}</span></p>
              <p>Total Factura: <span className="text-slate-900 font-bold">${(selectedAbonoSale.salePrice * selectedAbonoSale.quantity).toLocaleString()}</span></p>
              <p>Monto Pagado: <span className="text-emerald-600 font-bold">${(selectedAbonoSale.paidAmount || 0).toLocaleString()}</span></p>
              <p className="text-rose-600 font-extrabold bg-rose-50 p-2.5 rounded-xl mt-2 flex justify-between border border-rose-100">
                <span>Saldo Deudor Restante:</span>
                <span>${(selectedAbonoSale.remainingAmount || 0).toLocaleString()}</span>
              </p>
            </div>

            <form onSubmit={handleRegisterAbonoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Fecha del Abono</label>
                <input
                  type="date"
                  value={abonoDate}
                  onChange={(e) => setAbonoDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                />
                <p className="text-[10px] text-slate-400">Opcional: Dejar vacío para usar la fecha de hoy</p>
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
                  {isSubmittingAbono ? "Procesando..." : "Registrar Abono"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sales Log Board */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-6">
        {/* Navigation Tabs for Sales board */}
        <div className="flex border-b border-slate-100 pb-2 space-x-6">
          <button
            onClick={() => setCurrentSection("historial")}
            className={`pb-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all ${
              currentSection === "historial"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Historial de Ventas
          </button>
          <button
            onClick={() => setCurrentSection("deudores")}
            className={`pb-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-1.5 ${
              currentSection === "deudores"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <span>Cuentas por Cobrar (Deudores)</span>
            {sales.filter(s => s.status === "pendiente" || (s.remainingAmount !== undefined && s.remainingAmount > 0)).length > 0 && (
              <span className="bg-amber-100 text-amber-700 font-black text-[10px] px-1.5 py-0.5 rounded-full">
                {sales.filter(s => s.status === "pendiente" || (s.remainingAmount !== undefined && s.remainingAmount > 0)).length}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder={currentSection === "deudores" ? "Buscar deudores por nombre o producto..." : "Buscar por cliente o producto..."}
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

        {/* Transactions list */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 bg-slate-50/50">
                <th className="p-4">Recibo / ID</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Producto</th>
                <th className="p-4">Cant</th>
                <th className="p-4">Total Venta</th>
                <th className="p-4">Cobrado / Pendiente</th>
                <th className="p-4">Ganancia ($)</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredSales.map((s) => {
                const total = s.salePrice * s.quantity;
                const paid = s.paidAmount !== undefined ? s.paidAmount : total;
                const remaining = s.remainingAmount !== undefined ? s.remainingAmount : 0;
                const isPending = s.status === "pendiente" || remaining > 0;

                return (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-blue-950 uppercase">
                      #{s.invoiceNumber || "000001"}
                    </td>
                    <td className="p-4">
                      <span className="flex items-center space-x-1 text-slate-500">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{s.date}</span>
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{s.customerName}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Tlf: {s.customerPhone}</p>
                    </td>
                    <td className="p-4 max-w-[150px] truncate">
                      <p className="font-bold text-slate-800 truncate">{s.productName}</p>
                      <p className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                        {s.category === "equipos" ? "Sin Gluten" : "Postre Saludable"}
                      </p>
                    </td>
                    <td className="p-4 text-center text-slate-500 font-bold">{s.quantity}</td>
                    <td className="p-4 font-extrabold text-slate-900">${total.toLocaleString()}</td>
                    <td className="p-4">
                      {(() => {
                        const abonosList = s.abonos || [];
                        const abonosTotal = abonosList.reduce((acc, a) => acc + a.amount, 0);
                        const initPayAmt = s.initialPaymentAmount !== undefined 
                          ? s.initialPaymentAmount 
                          : Math.max(0, (s.paidAmount || 0) - abonosTotal);
                        const initPayPct = s.initialPaymentPercentage !== undefined 
                          ? s.initialPaymentPercentage 
                          : (total > 0 ? (initPayAmt / total) * 100 : 0);

                        const origInstallments = s.installmentsCount || 1;
                        const abonosCount = abonosList.length;
                        const remainingInstallmentsCount = Math.max(0, origInstallments - abonosCount);
                        const cuotaRestanteAmt = remainingInstallmentsCount > 0 
                          ? remaining / remainingInstallmentsCount 
                          : 0;

                        return (
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold ${
                                isPending
                                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                                  : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                              }`}>
                                {isPending ? "Pendiente" : "Pagado"}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500">
                              Cobrado: <span className="font-bold text-slate-700">${paid.toLocaleString()}</span>
                            </p>
                            <p className="text-[10px] text-blue-600 font-bold">
                              Inicial: ${initPayAmt.toLocaleString()} ({initPayPct.toFixed(0)}%)
                            </p>
                            {isPending && (
                              <>
                                <p className="text-[10px] text-rose-600 font-bold">
                                  Resta: ${remaining.toLocaleString()}
                                </p>
                                <p className="text-[9px] text-slate-500 font-bold italic">
                                  Quedan: {remainingInstallmentsCount} cuot. de ${cuotaRestanteAmt.toLocaleString()}
                                </p>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-4 text-emerald-600 font-extrabold">
                      +${s.profit.toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end items-center space-x-1">
                        {isPending && onUpdateSaleDebt && (
                          <button
                            onClick={() => setSelectedAbonoSale(s)}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-all inline-flex items-center space-x-1 border border-transparent hover:border-amber-100"
                            title="Registrar Abono"
                          >
                            <CreditCard className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Abonar</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedReceiptSale(s)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all inline-flex items-center space-x-1 border border-transparent hover:border-blue-100"
                          title="Ver Recibo / Factura"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Factura</span>
                        </button>
                        {onEditSale && (
                          <button
                            onClick={() => handleOpenEditSale(s)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all inline-flex items-center space-x-1 border border-transparent hover:border-blue-100"
                            title="Editar Venta"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        {onDeleteSale && (
                          <button
                            onClick={() => {
                              askConfirmation(
                                "Eliminar Venta",
                                `¿Seguro que deseas eliminar este registro de venta? Esto devolverá ${s.quantity} unidad(es) de "${s.productName}" al stock.`,
                                () => {
                                  onDeleteSale(s.id);
                                }
                              );
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all inline-flex items-center space-x-1 border border-transparent hover:border-rose-100"
                            title="Eliminar Venta"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                    {currentSection === "deudores"
                      ? "No hay cuentas de clientes con saldos pendientes por cobrar."
                      : "No se encontraron transacciones registradas."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Sale Modal */}
      {editingSale && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[90] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg p-4 sm:p-6 shadow-2xl relative border border-slate-100 space-y-6 my-auto max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setEditingSale(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Edit className="h-5 w-5 text-blue-600" />
                <span>Modificar Venta Registrada</span>
              </h3>
              <p className="text-xs text-slate-500">
                Ajusta los detalles de la venta del cliente.
              </p>
            </div>

            <form onSubmit={handleEditSaleSubmit} className="space-y-4">
              {/* Product selection / input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Producto Vendido</label>
                <select
                  value={editProductId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setEditProductId(pid);
                    const prod = products.find(p => p.id === pid);
                    if (prod) {
                      setEditProductName(prod.name);
                      setEditSalePrice(String(prod.salePrice));
                      setEditProductCategory(prod.category);
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                >
                  <option value="">-- Seleccionar de catálogo o personalizado --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - ${p.salePrice}</option>
                  ))}
                </select>
                {!editProductId && (
                  <input
                    type="text"
                    required
                    placeholder="Escribe nombre de producto personalizado..."
                    value={editProductName}
                    onChange={(e) => setEditProductName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold mt-1 transition-all outline-none"
                  />
                )}
              </div>

              {/* Product Category select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Categoría del Producto Vendido</label>
                <select
                  value={editProductCategory}
                  onChange={(e) => setEditProductCategory(e.target.value as ProductCategory)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                >
                  <option value={ProductCategory.Equipos}>Productos Sin Gluten</option>
                  <option value={ProductCategory.Accesorios}>Postres Saludables</option>
                </select>
              </div>

              {/* Quantity, price, date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Precio Unitario ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editSalePrice}
                    onChange={(e) => setEditSalePrice(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Fecha de Venta</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                  />
                </div>
              </div>

              {/* Client Info */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Datos del Cliente</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nombre</label>
                    <input
                      type="text"
                      required
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Teléfono</label>
                    <input
                      type="text"
                      required
                      value={editCustomerPhone}
                      onChange={(e) => setEditCustomerPhone(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Cédula / RIF</label>
                    <input
                      type="text"
                      value={editCustomerCedula}
                      onChange={(e) => setEditCustomerCedula(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Correo (Opcional)</label>
                    <input
                      type="email"
                      value={editCustomerEmail}
                      onChange={(e) => setEditCustomerEmail(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Dirección</label>
                  <input
                    type="text"
                    value={editCustomerAddress}
                    onChange={(e) => setEditCustomerAddress(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                  />
                </div>
              </div>

              {/* Payment details */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Estado de Cobro y Pago</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Método de Pago</label>
                    <select
                      value={editPaymentMethod}
                      onChange={(e) => setEditPaymentMethod(e.target.value)}
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
                    <label className="text-xs font-bold text-slate-500 uppercase">Monto Cancelado ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editPaidAmount}
                      onChange={(e) => setEditPaidAmount(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
                    />
                  </div>
                </div>

                {parseFloat(editPaidAmount) < (parseFloat(editSalePrice) * parseInt(editQuantity, 10)) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-amber-50 p-3 rounded-2xl border border-amber-100 animate-fade-in">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-amber-700 uppercase">Número de Cuotas</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={editInstallmentsCount}
                        onChange={(e) => setEditInstallmentsCount(e.target.value)}
                        className="w-full p-2 bg-white border border-amber-200 rounded-lg text-xs font-semibold transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-amber-700 uppercase">Periodicidad de Cobro</label>
                      <select
                        value={editPaymentPeriodicity}
                        onChange={(e) => setEditPaymentPeriodicity(e.target.value)}
                        className="w-full p-2 bg-white border border-amber-200 rounded-lg text-xs font-semibold transition-all outline-none cursor-pointer"
                      >
                        <option value="semanal">Semanal</option>
                        <option value="quincenal">Quincenal</option>
                        <option value="mensual">Mensual</option>
                        <option value="especifico">Fecha Específica</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-amber-700 uppercase">Fecha Límite</label>
                      <input
                        type="date"
                        value={editSpecificPaymentDate}
                        onChange={(e) => setEditSpecificPaymentDate(e.target.value)}
                        className="w-full p-2 bg-white border border-amber-200 rounded-lg text-xs font-semibold transition-all outline-none"
                      />
                    </div>
                  </div>
                )}
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
                  onClick={() => setEditingSale(null)}
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
