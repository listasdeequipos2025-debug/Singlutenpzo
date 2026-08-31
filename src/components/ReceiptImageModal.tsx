import React, { useState } from "react";
import { Download, Share2, MessageSquare, X, Check, Image as ImageIcon, Copy } from "lucide-react";
import { Sale } from "../types";

interface ReceiptImageModalProps {
  sale: Sale;
  dataUrl: string;
  onClose: () => void;
  onWhatsAppText?: () => void;
}

export const ReceiptImageModal: React.FC<ReceiptImageModalProps> = ({
  sale,
  dataUrl,
  onClose,
  onWhatsAppText,
}) => {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const fileName = `Recibo_Venta_${sale.invoiceNumber || "000001"}_${(sale.customerName || "Cliente").replace(/[^a-zA-Z0-9]/g, "_")}.png`;

  // Handle direct file download using Data URL
  const handleDirectDownload = () => {
    try {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.warn("Direct anchor click failed, opening in window:", e);
      window.open(dataUrl, "_blank");
    }
  };

  // Handle Android Native Share / Save to Gallery
  const handleAndroidNativeShare = async () => {
    setSharing(true);
    try {
      // Convert dataUrl to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Recibo #${sale.invoiceNumber || "000001"} - SinGlutenpzo`,
          text: `Estimado(a) ${sale.customerName}, le adjuntamos su Recibo de Venta. ¡Muchas gracias por su preferencia!`,
        });
      } else {
        // Fallback to direct download
        handleDirectDownload();
      }
    } catch (err) {
      console.log("Web Share cancelled or failed:", err);
      handleDirectDownload();
    } finally {
      setSharing(false);
    }
  };

  // Copy Image to Clipboard if supported
  const handleCopyToClipboard = async () => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob })
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } else {
        handleDirectDownload();
      }
    } catch (err) {
      console.warn("Clipboard copy failed:", err);
      handleDirectDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-amber-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-900/60 rounded-xl text-amber-200">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-amber-50">Imagen de Recibo Generada</h3>
              <p className="text-[11px] text-amber-200/80 font-medium">
                #{sale.invoiceNumber || "000001"} — {sale.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full text-amber-200 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body - Image Preview */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-50 flex flex-col items-center justify-center space-y-3">
          {/* Helpful Tip for Redmi 14 / Android */}
          <div className="w-full bg-blue-50 border border-blue-200 rounded-2xl p-3 text-xs text-blue-900 space-y-1">
            <p className="font-extrabold flex items-center text-blue-950">
              <span className="mr-1.5">📱</span> Para Redmi 14 y teléfonos Android:
            </p>
            <p className="text-[11px] leading-relaxed text-blue-800">
              Puedes presionar <strong>"Guardar en Galería"</strong> o <strong>MANTENER PRESIONADA</strong> la imagen abajo y seleccionar <em>"Guardar imagen"</em> para guardarla directamente en las fotos de tu teléfono.
            </p>
          </div>

          {/* Rendered PNG Image */}
          <div className="relative group max-w-full bg-white p-2 rounded-2xl shadow-md border border-slate-200">
            <img
              src={dataUrl}
              alt={`Recibo #${sale.invoiceNumber || "000001"}`}
              className="max-h-[50vh] w-auto object-contain rounded-xl select-all"
            />
          </div>
        </div>

        {/* Modal Footer - Actions */}
        <div className="p-4 bg-white border-t border-slate-100 space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleAndroidNativeShare}
              disabled={sharing}
              className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-md transition-all disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" />
              <span>{sharing ? "Abriendo..." : "Guardar / Compartir"}</span>
            </button>

            <button
              onClick={handleDirectDownload}
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-md transition-all"
            >
              <Download className="h-4 w-4" />
              <span>Descargar PNG</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleCopyToClipboard}
              className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase flex items-center justify-center space-x-1.5 transition-all"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700 font-extrabold">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copiar Imagen</span>
                </>
              )}
            </button>

            {onWhatsAppText && (
              <button
                onClick={onWhatsAppText}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold uppercase flex items-center justify-center space-x-1.5 shadow-sm transition-all"
              >
                <MessageSquare className="h-4 w-4" />
                <span>WhatsApp</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-1 py-2 text-center text-xs font-bold text-slate-400 hover:text-slate-600 uppercase"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
