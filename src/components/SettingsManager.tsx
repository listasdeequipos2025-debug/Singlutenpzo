import React, { useState, useEffect } from "react";
import {
  Lock, Check, AlertTriangle, MessageSquare, Phone, Mail, Server, Key,
  Info, HelpCircle, ShieldCheck, Database, Cloud, Download, Upload, RefreshCw
} from "lucide-react";

interface SettingsManagerProps {
  currentPin: string;
  onUpdatePin: (newPin: string) => Promise<void>;
  currentWhatsapp: string;
  onUpdateWhatsapp: (newWhatsapp: string) => Promise<void>;
  recoveryEmail: string;
  securityQuestion: string;
  securityAnswer: string;
  onUpdateRecoverySettings: (email: string, question: string, answer: string) => Promise<void>;
  products?: any[];
  sales?: any[];
  purchases?: any[];
  providers?: any[];
  expenses?: any[];
  returns?: any[];
  rawMaterials?: any[];
  recipes?: any[];
  onRestoreBackup?: (backupData: any) => Promise<void>;
  onManualSyncLocalToCloud?: () => Promise<{ migratedCount: number; collections: string[] }>;
}

export default function SettingsManager({
  currentPin,
  onUpdatePin,
  currentWhatsapp,
  onUpdateWhatsapp,
  recoveryEmail,
  securityQuestion,
  securityAnswer,
  onUpdateRecoverySettings,
  products = [],
  sales = [],
  purchases = [],
  providers = [],
  expenses = [],
  returns = [],
  rawMaterials = [],
  recipes = [],
  onRestoreBackup,
  onManualSyncLocalToCloud
}: SettingsManagerProps) {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);

  // Cloud & Backup states
  const [isSyncingLocal, setIsSyncingLocal] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState("");
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [restoreStatusMsg, setRestoreStatusMsg] = useState("");
  const [restoreErrorMsg, setRestoreErrorMsg] = useState("");

  // WhatsApp configuration states
  const [whatsappVal, setWhatsappVal] = useState(currentWhatsapp || "");
  const [whatsappError, setWhatsappError] = useState("");
  const [whatsappSuccess, setWhatsappSuccess] = useState(false);
  const [isSavingWhatsapp, setIsSavingWhatsapp] = useState(false);

  // Recovery configuration states
  const [emailVal, setEmailVal] = useState(recoveryEmail || "");
  const [questionVal, setQuestionVal] = useState(securityQuestion || "nombre_mascota");
  const [answerVal, setAnswerVal] = useState(securityAnswer || "");
  const [recoveryError, setRecoveryError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [isSavingRecovery, setIsSavingRecovery] = useState(false);

  // SMTP Server Configuration states
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSenderName, setSmtpSenderName] = useState("SinGlutenpzo");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [smtpSuccess, setSmtpSuccess] = useState(false);
  const [smtpError, setSmtpError] = useState("");
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Sync internal state when props change
  useEffect(() => {
    setWhatsappVal(currentWhatsapp || "");
  }, [currentWhatsapp]);

  useEffect(() => {
    setEmailVal(recoveryEmail || "");
    setQuestionVal(securityQuestion || "nombre_mascota");
    setAnswerVal(securityAnswer || "");
  }, [recoveryEmail, securityQuestion, securityAnswer]);

  // Load existing SMTP config from backend
  useEffect(() => {
    const fetchSmtpConfig = async () => {
      try {
        const res = await fetch("/api/email-config");
        if (res.ok) {
          const data = await res.json();
          if (data.configured) {
            setSmtpHost(data.host || "");
            setSmtpPort(data.port ? String(data.port) : "587");
            setSmtpUser(data.user || "");
            setSmtpSenderName(data.senderName || "SinGlutenpzo");
            setSmtpSecure(!!data.secure);
          }
        }
      } catch (err) {
        console.warn("Could not load SMTP config:", err);
      }
    };
    fetchSmtpConfig();
  }, []);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (oldPin !== currentPin) {
      setError("El PIN actual ingresado es incorrecto.");
      return;
    }

    if (newPin.length < 4) {
      setError("El nuevo PIN debe tener al menos 4 caracteres numéricos.");
      return;
    }

    if (newPin !== confirmPin) {
      setError("La confirmación del PIN no coincide con el nuevo PIN.");
      return;
    }

    setIsSavingPin(true);
    try {
      await onUpdatePin(newPin);
      setSuccess(true);
      setOldPin("");
      setNewPin("");
      setConfirmPin("");
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError("Error al guardar el nuevo PIN en el sistema: " + (err.message || String(err)));
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleWhatsappSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhatsappError("");
    setWhatsappSuccess(false);

    const clean = whatsappVal.replace(/[^0-9]/g, "");
    if (clean.length < 7) {
      setWhatsappError("Por favor ingresa un número de WhatsApp válido con código de país (ej. 584141234567).");
      return;
    }

    setIsSavingWhatsapp(true);
    try {
      await onUpdateWhatsapp(clean);
      setWhatsappSuccess(true);
      setTimeout(() => setWhatsappSuccess(false), 4000);
    } catch (err: any) {
      setWhatsappError("Error al guardar el número de WhatsApp: " + (err.message || String(err)));
    } finally {
      setIsSavingWhatsapp(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError("");
    setRecoverySuccess(false);

    const cleanEmail = emailVal.trim();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setRecoveryError("Por favor introduce un correo electrónico válido para la recuperación.");
      return;
    }

    const cleanAnswer = answerVal.trim();
    if (!cleanAnswer || cleanAnswer.length < 2) {
      setRecoveryError("Por favor ingresa una respuesta de seguridad de al menos 2 caracteres.");
      return;
    }

    setIsSavingRecovery(true);
    try {
      await onUpdateRecoverySettings(cleanEmail, questionVal, cleanAnswer);
      setRecoverySuccess(true);
      setTimeout(() => setRecoverySuccess(false), 4000);
    } catch (err: any) {
      setRecoveryError("Error al actualizar la configuración de recuperación: " + (err.message || String(err)));
    } finally {
      setIsSavingRecovery(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpError("");
    setSmtpSuccess(false);
    setTestResult(null);

    if (!smtpHost.trim()) {
      setSmtpError("El servidor SMTP es obligatorio (ej. smtp.gmail.com).");
      return;
    }
    if (!smtpUser.trim()) {
      setSmtpError("El usuario o correo del remitente es obligatorio.");
      return;
    }

    setIsSavingSmtp(true);
    try {
      const res = await fetch("/api/email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: smtpHost.trim(),
          port: parseInt(smtpPort, 10) || 587,
          user: smtpUser.trim(),
          pass: smtpPass,
          senderName: smtpSenderName.trim() || "SinGlutenpzo",
          secure: smtpSecure
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo guardar la configuración SMTP.");
      }

      setSmtpSuccess(true);
      setSmtpPass("");
      setTimeout(() => setSmtpSuccess(false), 5000);
    } catch (err: any) {
      setSmtpError("Error al guardar SMTP: " + (err.message || String(err)));
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    setTestResult(null);
    setSmtpError("");

    try {
      const targetEmail = emailVal.trim() || smtpUser.trim();
      if (!targetEmail || !targetEmail.includes("@")) {
        throw new Error("Especifica un correo en 'Correo Electrónico de Recuperación' o en el usuario SMTP para enviar la prueba.");
      }

      const res = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: targetEmail })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || "Fallo en el envío de correo de prueba.");
      }

      setTestResult({ ok: true, message: `¡Correo de prueba enviado con éxito a ${targetEmail}!` });
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || String(err) });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleDownloadBackup = () => {
    try {
      const backupData = {
        app: "SinGlutenpzo",
        version: "2.0",
        exportDate: new Date().toISOString(),
        products,
        sales,
        purchases,
        providers,
        expenses,
        returns,
        rawMaterials,
        recipes
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement("a");
      const timestamp = new Date().toISOString().split("T")[0];
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `singlutenpzo_backup_${timestamp}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e: any) {
      alert("Error al generar copia de seguridad: " + (e.message || String(e)));
    }
  };

  const handleFileUploadBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreStatusMsg("");
    setRestoreErrorMsg("");
    setIsRestoringBackup(true);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (onRestoreBackup) {
        await onRestoreBackup(data);
        setRestoreStatusMsg("¡Copia de seguridad restaurada exitosamente en Firebase Cloud!");
      }
    } catch (err: any) {
      setRestoreErrorMsg("Error al restaurar copia: " + (err.message || String(err)));
    } finally {
      setIsRestoringBackup(false);
      e.target.value = "";
    }
  };

  const handleManualSyncClick = async () => {
    if (!onManualSyncLocalToCloud) return;
    setIsSyncingLocal(true);
    setSyncStatusMsg("");
    try {
      const res = await onManualSyncLocalToCloud();
      if (res.migratedCount > 0) {
        setSyncStatusMsg(`¡Éxito! Se migraron ${res.migratedCount} registros locales (${res.collections.join(", ")}) a Firebase Cloud.`);
      } else {
        setSyncStatusMsg("Todos tus datos locales ya están 100% sincronizados con Firebase Cloud.");
      }
    } catch (err: any) {
      setSyncStatusMsg("Error al sincronizar: " + (err.message || String(err)));
    } finally {
      setIsSyncingLocal(false);
    }
  };

  const [activeExampleTab, setActiveExampleTab] = useState<"gmail" | "outlook" | "cpanel">("gmail");

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-12">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Ajustes del Sistema</h2>
        <p className="text-sm text-slate-500">Configura la persistencia en Firebase Cloud, el WhatsApp de la tienda y las credenciales de acceso.</p>
      </div>

      {/* Cloud Database Status & Backup Management Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-6">
        <div className="flex items-start justify-between pb-4 border-b border-slate-800 gap-4 flex-wrap">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500/20 p-3 rounded-2xl text-emerald-400 border border-emerald-500/30">
              <Cloud className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-white text-base">Google Firebase Cloud Firestore</h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Activo & Persistente
                </span>
              </div>
              <p className="text-xs text-slate-400">Base de datos en la nube de Google Cloud vinculada al proyecto</p>
            </div>
          </div>
        </div>

        {/* Database ID Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-2xl space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Database className="h-3 w-3 text-emerald-400" /> Base de Datos (Database ID)
            </span>
            <p className="text-xs font-mono font-bold text-emerald-300 break-all">ai-studio-singlutenpzo-b6e2e4e4-e16d-43e4-b7a7-7d0dc43d6467</p>
            <p className="text-[10px] text-slate-400">Instancia exclusiva de almacenamiento persistente en la nube.</p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-2xl space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-amber-400" /> Proyecto Google Cloud
            </span>
            <p className="text-xs font-mono font-bold text-amber-300">annular-circuit-wh7sp</p>
            <p className="text-[10px] text-slate-400">Registros sincronizados en tiempo real entre todos tus dispositivos.</p>
          </div>
        </div>

        {/* Action Buttons: Sync local data & Full Backup */}
        <div className="bg-slate-800/40 border border-slate-700/40 p-4 rounded-2xl space-y-4">
          <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">Herramientas de Respaldo y Recuperación</h4>
          
          <div className="flex flex-wrap gap-3">
            {/* Download JSON backup */}
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border border-slate-600 shadow-sm"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <span>Descargar Copia de Seguridad JSON ({products.length} productos, {sales.length} ventas)</span>
            </button>

            {/* Restore JSON backup */}
            <label className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border border-slate-600 shadow-sm cursor-pointer">
              <Upload className="h-4 w-4 text-sky-400" />
              <span>{isRestoringBackup ? "Restaurando..." : "Restaurar Copia JSON"}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUploadBackup}
                disabled={isRestoringBackup}
                className="hidden"
              />
            </label>

            {/* Force scan & sync local storage */}
            {onManualSyncLocalToCloud && (
              <button
                type="button"
                onClick={handleManualSyncClick}
                disabled={isSyncingLocal}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 shadow-md"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncingLocal ? "animate-spin" : ""}`} />
                <span>{isSyncingLocal ? "Sincronizando..." : "Escanear y Subir Datos Locales"}</span>
              </button>
            )}
          </div>

          {syncStatusMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs rounded-xl flex items-center space-x-2">
              <Check className="h-4 w-4 flex-shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
          )}

          {restoreStatusMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs rounded-xl flex items-center space-x-2">
              <Check className="h-4 w-4 flex-shrink-0" />
              <span>{restoreStatusMsg}</span>
            </div>
          )}

          {restoreErrorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{restoreErrorMsg}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cambiar PIN */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-amber-100 p-3 rounded-2xl text-amber-700">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Cambiar Clave de Acceso (PIN)</h3>
                <p className="text-xs text-slate-500">Actualiza el código de 4 dígitos para acceder al panel de administración.</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center space-x-2">
                <Check className="h-4 w-4 flex-shrink-0" />
                <span>¡PIN actualizado correctamente en la nube!</span>
              </div>
            )}

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">PIN Actual</label>
                <input
                  type="password"
                  maxLength={10}
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                  placeholder="Introduce el PIN actual"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nuevo PIN</label>
                <input
                  type="password"
                  maxLength={10}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Introduce nuevo PIN (mín. 4 dígitos)"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Confirmar Nuevo PIN</label>
                <input
                  type="password"
                  maxLength={10}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Repite el nuevo PIN"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingPin}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isSavingPin ? "Guardando..." : "Guardar Nuevo PIN"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Configuración de WhatsApp */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-700">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">WhatsApp de la Tienda</h3>
                <p className="text-xs text-slate-500">Número al que los clientes envían sus pedidos del catálogo digital.</p>
              </div>
            </div>

            {whatsappError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{whatsappError}</span>
              </div>
            )}

            {whatsappSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center space-x-2">
                <Check className="h-4 w-4 flex-shrink-0" />
                <span>¡Número de WhatsApp guardado exitosamente!</span>
              </div>
            )}

            <form onSubmit={handleWhatsappSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Número de Teléfono con Código de País
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    value={whatsappVal}
                    onChange={(e) => setWhatsappVal(e.target.value)}
                    placeholder="Ej. 584148900000"
                    required
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Introduce el código de país sin el símbolo "+" ni espacios (ejemplo: <strong>584141234567</strong> para Venezuela).
                </p>
              </div>

              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100/80 text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-amber-600 flex-shrink-0" /> ¿Cómo funciona?
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Cuando un cliente arme su carrito en el catálogo digital y presione "Enviar Pedido", se abrirá automáticamente una conversación de WhatsApp con este número conteniendo el detalle completo de la compra.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingWhatsapp}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isSavingWhatsapp ? "Guardando..." : "Guardar Número de WhatsApp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Configuración de Recuperación de PIN */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-sky-100 p-3 rounded-2xl text-sky-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Recuperación de Contraseña y PIN</h3>
            <p className="text-xs text-slate-500">Configura los métodos de auxilio para restablecer el acceso en caso de olvidar tu PIN.</p>
          </div>
        </div>

        {recoveryError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{recoveryError}</span>
          </div>
        )}

        {recoverySuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center space-x-2">
            <Check className="h-4 w-4 flex-shrink-0" />
            <span>¡Datos de recuperación guardados exitosamente!</span>
          </div>
        )}

        <form onSubmit={handleRecoverySubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Correo Electrónico de Recuperación
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  value={emailVal}
                  onChange={(e) => setEmailVal(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                A este correo se enviará el código de verificación temporal cuando solicites restablecer el PIN.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Pregunta de Seguridad Secreta
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <HelpCircle className="h-4 w-4" />
                </span>
                <select
                  value={questionVal}
                  onChange={(e) => setQuestionVal(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="nombre_mascota">¿Cuál es el nombre de tu primera mascota?</option>
                  <option value="ciudad_nacimiento">¿En qué ciudad naciste?</option>
                  <option value="escuela_primaria">¿Cómo se llamaba tu escuela primaria?</option>
                  <option value="comida_favorita">¿Cuál es tu comida o postre favorito?</option>
                  <option value="cancion_favorita">¿Cuál es el nombre de tu canción favorita?</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Método instantáneo alternativo por si no tienes acceso inmediato a tu correo.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Respuesta Secreta
            </label>
            <input
              type="text"
              value={answerVal}
              onChange={(e) => setAnswerVal(e.target.value)}
              placeholder="Ingresa la respuesta a la pregunta secreta"
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              La verificación no distingue entre mayúsculas y minúsculas.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingRecovery}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center space-x-2"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{isSavingRecovery ? "Guardando..." : "Guardar Ajustes de Recuperación"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Configuración de Servidor de Correo SMTP */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-violet-100 p-3 rounded-2xl text-violet-700">
            <Server className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Servidor de Correos (SMTP)</h3>
            <p className="text-xs text-slate-500">Configura la cuenta de correo emisora para enviar códigos de seguridad a tu correo electrónico.</p>
          </div>
        </div>

        {smtpError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{smtpError}</span>
          </div>
        )}

        {smtpSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center space-x-2">
            <Check className="h-4 w-4 flex-shrink-0" />
            <span>¡Configuración SMTP guardada correctamente!</span>
          </div>
        )}

        {testResult && (
          <div className={`mb-4 p-3 rounded-xl text-xs flex items-center space-x-2 ${testResult.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-rose-50 border border-rose-200 text-rose-700"}`}>
            {testResult.ok ? <Check className="h-4 w-4 flex-shrink-0" /> : <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}

        <form onSubmit={handleSaveSmtp} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Servidor SMTP (Host)
              </label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com o smtp.office365.com"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Puerto SMTP
              </label>
              <input
                type="text"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587 o 465"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Usuario / Correo Remitente
              </label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="tutienda@gmail.com"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Contraseña de Aplicación / Password
              </label>
              <input
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder={smtpUser ? "•••••••••••• (deja en blanco para mantener)" : "Ingresa la contraseña"}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Nombre del Remitente
              </label>
              <input
                type="text"
                value={smtpSenderName}
                onChange={(e) => setSmtpSenderName(e.target.value)}
                placeholder="SinGlutenpzo Notificaciones"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="flex items-center space-x-3 pt-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={smtpSecure}
                  onChange={(e) => setSmtpSecure(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
              </label>
              <span className="text-xs font-bold text-slate-700">Usar Conexión Segura SSL (Puerto 465)</span>
            </div>
          </div>

          {/* Guía rápida de configuración por proveedor */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Key className="h-4 w-4 text-violet-600" /> Guía para obtener la contraseña:
              </span>
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => setActiveExampleTab("gmail")}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${activeExampleTab === "gmail" ? "bg-violet-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
                >
                  Gmail
                </button>
                <button
                  type="button"
                  onClick={() => setActiveExampleTab("outlook")}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${activeExampleTab === "outlook" ? "bg-violet-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
                >
                  Outlook / Hotmail
                </button>
                <button
                  type="button"
                  onClick={() => setActiveExampleTab("cpanel")}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${activeExampleTab === "cpanel" ? "bg-violet-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
                >
                  cPanel / Dominio propio
                </button>
              </div>
            </div>

            {activeExampleTab === "gmail" && (
              <div className="text-slate-600 space-y-1 leading-relaxed">
                <p><strong>Host:</strong> <code className="bg-white px-1.5 py-0.5 rounded text-violet-700 border">smtp.gmail.com</code> | <strong>Puerto:</strong> <code className="bg-white px-1.5 py-0.5 rounded text-violet-700 border">587</code></p>
                <p>1. Ve a tu cuenta de Google &gt; <strong>Seguridad</strong> &gt; activa <strong>Verificación en dos pasos</strong>.</p>
                <p>2. En el buscador de Google escribe <strong>"Contraseñas de aplicaciones"</strong> y crea una para "Correo / App".</p>
                <p>3. Pega esa clave de 16 caracteres aquí (no uses tu contraseña normal de Gmail).</p>
              </div>
            )}

            {activeExampleTab === "outlook" && (
              <div className="text-slate-600 space-y-1 leading-relaxed">
                <p><strong>Host:</strong> <code className="bg-white px-1.5 py-0.5 rounded text-violet-700 border">smtp.office365.com</code> | <strong>Puerto:</strong> <code className="bg-white px-1.5 py-0.5 rounded text-violet-700 border">587</code></p>
                <p>Usa tu correo completo y tu contraseña habitual de Outlook/Microsoft.</p>
              </div>
            )}

            {activeExampleTab === "cpanel" && (
              <div className="text-slate-600 space-y-1 leading-relaxed">
                <p><strong>Host:</strong> <code className="bg-white px-1.5 py-0.5 rounded text-violet-700 border">mail.tudominio.com</code> | <strong>Puerto:</strong> <code className="bg-white px-1.5 py-0.5 rounded text-violet-700 border">465 (SSL)</code> o <code className="bg-white px-1.5 py-0.5 rounded text-violet-700 border">587</code></p>
                <p>Usa la cuenta de correo corporativo creada en tu cPanel y su contraseña correspondiente.</p>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
            <button
              type="button"
              onClick={handleTestSmtp}
              disabled={isTestingSmtp || isSavingSmtp}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center space-x-2 border border-slate-300"
            >
              <Mail className="h-4 w-4" />
              <span>{isTestingSmtp ? "Enviando prueba..." : "Enviar Correo de Prueba"}</span>
            </button>

            <button
              type="submit"
              disabled={isSavingSmtp}
              className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center space-x-2"
            >
              <Server className="h-4 w-4" />
              <span>{isSavingSmtp ? "Guardando..." : "Guardar Servidor SMTP"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
