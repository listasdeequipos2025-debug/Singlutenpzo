import html2canvas from "html2canvas";
import { Sale } from "../types";
import logoImg from "../assets/images/singlutenpzo_logo_1785767632220.jpg";

/**
 * Draws a pixel-perfect, crisp Receipt image directly using HTML5 Canvas 2D.
 * This guarantees 100% reliable PNG image generation on any device/browser
 * without relying on html2canvas DOM parsing bugs or Tailwind CSS variable issues.
 */
export async function drawReceiptToCanvas(sale: Sale): Promise<HTMLCanvasElement> {
  const width = 640;
  
  // Calculate dynamic height based on content
  const abonosCount = (sale.abonos || []).length;
  let height = 720 + (abonosCount * 24);
  if (sale.customerAddress) height += 25;
  if (sale.paymentPeriodicity) height += 35;
  if (sale.remainingAmount && sale.remainingAmount > 0) height += 50;

  const canvas = document.createElement("canvas");
  const scale = 2; // High-DPI Retina scale
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2d canvas context");

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Outer Border & Card Shadow Effect
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  let y = 35;

  // Load and Draw Logo Image or Stylized Text Badge
  try {
    const img = new Image();
    img.src = logoImg;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = resolve; // Continue even if logo fails
      setTimeout(resolve, 1500); // Timeout safety
    });

    if (img.complete && img.naturalWidth > 0) {
      const logoWidth = 60;
      const logoHeight = 60;
      ctx.drawImage(img, (width - logoWidth) / 2, y, logoWidth, logoHeight);
      y += logoHeight + 12;
    }
  } catch (e) {
    console.warn("Logo load skipped for canvas receipt:", e);
  }

  // Header Title
  ctx.textAlign = "center";
  ctx.fillStyle = "#451a03"; // Dark amber
  ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
  ctx.fillText("SinGlutenpzo", width / 2, y);
  y += 20;

  ctx.fillStyle = "#047857"; // Emerald green
  ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
  ctx.fillText("ORIVEN DISTRIBUIDORA DE ALIMENTOS J-40633400-6", width / 2, y);
  y += 16;

  ctx.fillStyle = "#64748b"; // Slate gray
  ctx.font = "500 11px system-ui, -apple-system, sans-serif";
  ctx.fillText("Puerto Ordaz, Estado Bolívar", width / 2, y);
  y += 22;

  // Dashed separator line
  ctx.beginPath();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.moveTo(30, y);
  ctx.lineTo(width - 30, y);
  ctx.stroke();
  ctx.setLineDash([]);
  y += 20;

  // Customer & Receipt Meta Box
  ctx.textAlign = "left";
  ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#64748b";

  // Column 1 (Left)
  ctx.fillText("CLIENTE:", 35, y);
  ctx.fillStyle = "#0f172a";
  ctx.fillText(sale.customerName || "Cliente General", 100, y);

  // Column 2 (Right)
  ctx.fillStyle = "#64748b";
  ctx.fillText("RECIBO:", width - 210, y);
  ctx.fillStyle = "#0f172a";
  ctx.fillText(`#${sale.invoiceNumber || "000001"}`, width - 150, y);
  y += 18;

  ctx.fillStyle = "#64748b";
  ctx.fillText("TELÉFONO:", 35, y);
  ctx.fillStyle = "#0f172a";
  ctx.fillText(sale.customerPhone || "N/A", 100, y);

  ctx.fillStyle = "#64748b";
  ctx.fillText("Nº CONTROL:", width - 210, y);
  ctx.fillStyle = "#0f172a";
  ctx.fillText(`#${sale.controlNumber || sale.invoiceNumber || "000001"}`, width - 130, y);
  y += 18;

  ctx.fillStyle = "#64748b";
  ctx.fillText("CÉDULA/RIF:", 35, y);
  ctx.fillStyle = "#0f172a";
  ctx.fillText(sale.customerCedula || "N/A", 100, y);

  ctx.fillStyle = "#64748b";
  ctx.fillText("FECHA:", width - 210, y);
  ctx.fillStyle = "#0f172a";
  ctx.fillText(sale.date || "", width - 150, y);
  y += 18;

  if (sale.customerAddress) {
    ctx.fillStyle = "#64748b";
    ctx.fillText("DIRECCIÓN:", 35, y);
    ctx.fillStyle = "#0f172a";
    ctx.fillText(sale.customerAddress, 110, y);
    y += 18;
  }

  if (sale.paymentPeriodicity && sale.remainingAmount && sale.remainingAmount > 0) {
    ctx.fillStyle = "#1d4ed8";
    ctx.fillText("PLAN DE COBRO:", 35, y);
    ctx.fillStyle = "#0f172a";
    ctx.fillText(sale.paymentPeriodicity, 135, y);

    if (sale.specificPaymentDate) {
      ctx.fillStyle = "#be123c";
      ctx.fillText("FECHA LÍMITE:", width - 210, y);
      ctx.fillStyle = "#e11d48";
      ctx.fillText(sale.specificPaymentDate, width - 130, y);
    }
    y += 20;
  }

  y += 8;

  // Items Table Header
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(30, y, width - 60, 26);
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.strokeRect(30, y, width - 60, 26);

  ctx.fillStyle = "#475569";
  ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
  ctx.fillText("CONCEPTO / PRODUCTO", 42, y + 17);
  ctx.textAlign = "center";
  ctx.fillText("CANT", width - 140, y + 17);
  ctx.textAlign = "right";
  ctx.fillText("TOTAL", width - 42, y + 17);
  y += 36;

  // Item Row
  ctx.textAlign = "left";
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
  
  // Truncate/Wrap product name if too long
  let prodName = sale.productName || "Producto / Servicio";
  if (prodName.length > 42) {
    prodName = prodName.substring(0, 40) + "...";
  }
  ctx.fillText(prodName, 42, y);

  ctx.textAlign = "center";
  ctx.fillText(String(sale.quantity || 1), width - 140, y);

  const totalItem = (sale.salePrice || 0) * (sale.quantity || 1);
  ctx.textAlign = "right";
  ctx.fillStyle = "#0284c7";
  ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
  ctx.fillText(`$${totalItem.toLocaleString()}`, width - 42, y);
  y += 25;

  // Table bottom divider
  ctx.beginPath();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.moveTo(30, y);
  ctx.lineTo(width - 30, y);
  ctx.stroke();
  y += 20;

  // Payment Summary Section
  ctx.textAlign = "left";
  ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("Método de Pago:", 35, y);
  ctx.fillStyle = "#0f172a";
  ctx.fillText(sale.paymentMethod || "Efectivo", 140, y);

  // Status Badge
  const isPending = sale.status === "pendiente" || (sale.remainingAmount !== undefined && sale.remainingAmount > 0);
  const badgeText = isPending ? "CRÉDITO / PENDIENTE" : "CONTADO / PAGADO";
  ctx.fillStyle = isPending ? "#fef3c7" : "#dcfce7";
  ctx.fillRect(width - 180, y - 13, 145, 20);
  ctx.strokeStyle = isPending ? "#fde68a" : "#bbf7d0";
  ctx.strokeRect(width - 180, y - 13, 145, 20);
  
  ctx.textAlign = "center";
  ctx.fillStyle = isPending ? "#b45309" : "#15803d";
  ctx.font = "bold 10px system-ui, -apple-system, sans-serif";
  ctx.fillText(badgeText, width - 107, y + 1);
  y += 26;

  // Totals Breakdown
  ctx.textAlign = "left";
  ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("Monto Total Venta:", 35, y);
  ctx.textAlign = "right";
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
  ctx.fillText(`$${totalItem.toLocaleString()}`, width - 35, y);
  y += 20;

  const abonosTotal = (sale.abonos || []).reduce((acc, a) => acc + a.amount, 0);
  const paid = sale.paidAmount !== undefined ? sale.paidAmount : totalItem;
  ctx.textAlign = "left";
  ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#16a34a";
  ctx.fillText("Monto Pagado (Totalizado):", 35, y);
  ctx.textAlign = "right";
  ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
  ctx.fillText(`$${paid.toLocaleString()}`, width - 35, y);
  y += 20;

  // Initial Payment & Credit Details
  const initPayAmt = sale.initialPaymentAmount !== undefined 
    ? sale.initialPaymentAmount 
    : Math.max(0, paid - abonosTotal);
  const initPayPct = sale.initialPaymentPercentage !== undefined 
    ? sale.initialPaymentPercentage 
    : (totalItem > 0 ? (initPayAmt / totalItem) * 100 : 0);

  ctx.textAlign = "left";
  ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#2563eb";
  ctx.fillText("Abono Inicial (Inicial):", 35, y);
  ctx.textAlign = "right";
  ctx.fillText(`$${initPayAmt.toLocaleString()} (${initPayPct.toFixed(1)}%)`, width - 35, y);
  y += 20;

  const origInstallments = sale.installmentsCount || 1;
  const remaining = sale.remainingAmount !== undefined ? sale.remainingAmount : 0;
  const remainingInstallmentsCount = Math.max(0, origInstallments - abonosCount);

  if (remaining > 0) {
    const creditDebt = totalItem - initPayAmt;
    const originalCuotaAmt = origInstallments > 0 ? creditDebt / origInstallments : 0;
    const cuotaRestanteAmt = remainingInstallmentsCount > 0 ? remaining / remainingInstallmentsCount : 0;

    ctx.textAlign = "left";
    ctx.fillStyle = "#475569";
    ctx.fillText("Plan Original:", 35, y);
    ctx.textAlign = "right";
    ctx.fillText(`${origInstallments} cuotas de $${originalCuotaAmt.toLocaleString()} c/u`, width - 35, y);
    y += 18;

    ctx.textAlign = "left";
    ctx.fillStyle = "#e11d48";
    ctx.fillText("Cuotas Pendientes:", 35, y);
    ctx.textAlign = "right";
    ctx.fillText(`${remainingInstallmentsCount} cuotas de $${cuotaRestanteAmt.toLocaleString()} c/u`, width - 35, y);
    y += 22;

    // Red Box for Remaining Debt
    ctx.fillStyle = "#fff1f2";
    ctx.fillRect(30, y - 14, width - 60, 28);
    ctx.strokeStyle = "#fecdd3";
    ctx.strokeRect(30, y - 14, width - 60, 28);

    ctx.textAlign = "left";
    ctx.fillStyle = "#be123c";
    ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
    ctx.fillText("RESTANTE POR PAGAR:", 42, y + 4);
    ctx.textAlign = "right";
    ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
    ctx.fillText(`$${remaining.toLocaleString()}`, width - 42, y + 4);
    y += 26;
  }

  // Abonos History
  if (abonosCount > 0) {
    y += 8;
    ctx.textAlign = "left";
    ctx.fillStyle = "#2563eb";
    ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
    ctx.fillText("HISTORIAL DE ABONOS RECIBIDOS:", 35, y);
    y += 16;

    for (const ab of (sale.abonos || [])) {
      ctx.fillStyle = "#475569";
      ctx.font = "500 11px system-ui, -apple-system, sans-serif";
      ctx.fillText(`• ${ab.date} (${ab.paymentMethod}):`, 45, y);
      ctx.textAlign = "right";
      ctx.fillStyle = "#15803d";
      ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
      ctx.fillText(`+$${ab.amount.toLocaleString()}`, width - 35, y);
      ctx.textAlign = "left";
      y += 18;
    }
  }

  y += 15;

  // Footer Message
  ctx.beginPath();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.moveTo(30, y);
  ctx.lineTo(width - 30, y);
  ctx.stroke();
  ctx.setLineDash([]);
  y += 22;

  ctx.textAlign = "center";
  ctx.fillStyle = "#b45309";
  ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
  ctx.fillText("¡Gracias por su preferencia en SinGlutenpzo!", width / 2, y);
  y += 16;

  ctx.fillStyle = "#64748b";
  ctx.font = "500 10px system-ui, -apple-system, sans-serif";
  ctx.fillText("Oriven Distribuidora de Alimentos — Puerto Ordaz", width / 2, y);

  return canvas;
}

/**
 * Robust Receipt Image Generator:
 * Tries html2canvas first; if html2canvas fails, times out, or errors,
 * seamlessly falls back to pure 2D canvas drawing (drawReceiptToCanvas).
 */
export async function generateReceiptCanvas(
  sale: Sale,
  domElement?: HTMLElement | null
): Promise<HTMLCanvasElement> {
  if (domElement) {
    try {
      const htmlCanvas = await Promise.race([
        html2canvas(domElement, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          logging: false,
          imageTimeout: 5000,
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
            const imgs = clonedElement.querySelectorAll('img');
            imgs.forEach((img) => img.removeAttribute('crossorigin'));
          }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("html2canvas timeout")), 4000)
        )
      ]);

      if (htmlCanvas && htmlCanvas.width > 0 && htmlCanvas.height > 0) {
        return htmlCanvas;
      }
    } catch (e) {
      console.warn("html2canvas failed or timed out, falling back to native Canvas renderer:", e);
    }
  }

  // Guaranteed native 2D Canvas fallback
  return await drawReceiptToCanvas(sale);
}

/**
 * Downloads the receipt image as PNG file on the device.
 */
export async function downloadReceiptImage(
  sale: Sale,
  domElement?: HTMLElement | null
): Promise<void> {
  const canvas = await generateReceiptCanvas(sale, domElement);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not create blob from receipt canvas"));
        return;
      }

      const fileName = `Recibo_Venta_${sale.invoiceNumber || "000001"}_${(sale.customerName || "Cliente").replace(/[^a-zA-Z0-9]/g, "_")}.png`;
      const blobUrl = URL.createObjectURL(blob);

      // Create download anchor
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Fallback for mobile browsers that block anchor clicks
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 30000);

      resolve();
    }, "image/png");
  });
}

/**
 * Shares or prepares the receipt PNG image for WhatsApp / Device Sharing.
 */
export async function shareReceiptImage(
  sale: Sale,
  domElement?: HTMLElement | null,
  onWhatsAppFallback?: () => void
): Promise<{ success: boolean; method: string }> {
  const canvas = await generateReceiptCanvas(sale, domElement);

  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        if (onWhatsAppFallback) onWhatsAppFallback();
        resolve({ success: false, method: "error" });
        return;
      }

      const fileName = `Recibo_${sale.invoiceNumber || "000001"}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      // 1. Web Share API (Mobile native share sheet)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Recibo #${sale.invoiceNumber || "000001"} - SinGlutenpzo`,
            text: `Estimado(a) ${sale.customerName}, le adjuntamos su Recibo de Venta. ¡Muchas gracias por su preferencia!`,
          });
          resolve({ success: true, method: "web-share" });
          return;
        } catch (e) {
          console.log("Web share was cancelled or failed:", e);
        }
      }

      // 2. Clipboard API (Copy PNG image directly to clipboard for WhatsApp Web)
      let imageCopied = false;
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
          ]);
          imageCopied = true;
        }
      } catch (clipErr) {
        console.log("Clipboard write failed:", clipErr);
      }

      // 3. Trigger File Download
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Open WhatsApp chat text
      if (onWhatsAppFallback) {
        onWhatsAppFallback();
      }

      // User Alert
      if (imageCopied) {
        alert("📸 ¡Imagen del recibo generada y copiada al portapapeles!\n\n1. La imagen se ha guardado en tus descargas.\n2. Se ha abierto el chat de WhatsApp. En la conversación del cliente, presiona Pegar (Ctrl + V) para enviar la imagen del recibo.");
      } else {
        alert("📸 ¡Imagen del recibo descargada a tu equipo!\n\n1. Se ha abierto el chat de WhatsApp del cliente.\n2. Haz clic en el icono de adjuntar (clip) en WhatsApp y selecciona la imagen descargada '" + fileName + "'.");
      }

      resolve({ success: true, method: imageCopied ? "clipboard+download" : "download" });
    }, "image/png");
  });
}
