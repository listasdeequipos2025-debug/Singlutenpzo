import React, { useState, useEffect } from "react";
import { Lock, Check, AlertTriangle, MessageSquare, Phone, Mail, Server, Key, Info, HelpCircle, ShieldCheck } from "lucide-react";

interface SettingsManagerProps {
  currentPin: string;
  onUpdatePin: (newPin: string) => Promise<void>;
  currentWhatsapp: string;
  onUpdateWhatsapp: (newWhatsapp: string) => Promise<void>;
  recoveryEmail: string;
  securityQuestion: string;
  securityAnswer: string;
  onUpdateRecoverySettings: (email: string, question: string, answer: string) => Promise<void>;
}

export default function SettingsManager({
  currentPin,
  onUpdatePin,
  currentWhatsapp,
  onUpdateWhatsapp,
  recoveryEmail,
  securityQuestion,
  securityAnswer,
  onUpdateRecoverySettings
}: SettingsManagerProps) {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);

  // WhatsApp configuration states
  const [whatsappVal, setWhatsappVal] = useState(currentWhatsapp || "");
  const [whatsappError, setWhatsappError] = useState("");
  const [whatsappSuccess, setWhatsappSuccess] = useState(false);
  const [isSavingWhatsapp, setIsSavingWhatsapp] = useState(false);
  const [isWhatsappDirty, setIsWhatsappDirty] = useState(false);

  // Security Recovery Configuration states
  const [emailVal, setEmailVal] = useState(recoveryEmail || "");
  const [questionVal, setQuestionVal] = useState(securityQuestion || "¿Cuál es tu producto o receta sin gluten favorita?");
  const [answerVal, setAnswerVal] = useState(securityAnswer || "");
  const [recoveryError, setRecoveryError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [isSavingRecovery, setIsSavingRecovery] = useState(false);
  const [isRecoveryDirty, setIsRecoveryDirty] = useState(false);

  useEffect(() => {
    if (currentWhatsapp && !isWhatsappDirty) {
      setWhatsappVal(currentWhatsapp);
    }
  }, [currentWhatsapp, isWhatsappDirty]);

  useEffect(() => {
    if (!isRecoveryDirty) {
      setEmailVal(recoveryEmail);
      setQuestionVal(securityQuestion);
      setAnswerVal(securityAnswer);
    }
  }, [recoveryEmail, securityQuestion, securityAnswer, isRecoveryDirty]);

  const handleUpdatePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsSavingPin(true);

    if (oldPin !== currentPin) {
      setError("El PIN actual ingresado es incorrecto.");
      setIsSavingPin(false);
      return;
    }

    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      setError("El nuevo PIN debe ser exactamente de 4 dígitos numéricos.");
      setIsSavingPin(false);
      return;
    }

    if (newPin !== confirmPin) {
      setError("La confirmación del nuevo PIN no coincide.");
      setIsSavingPin(false);
      return;
    }

    try {
      await onUpdatePin(newPin);
      setSuccess(true);
      setOldPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (err: any) {
      const message = err.message || String(err);
      let friendlyError = "Error al actualizar el PIN.";
      if (message.startsWith("{") && message.endsWith("}")) {
        try {
          const parsed = JSON.parse(message);
          if (parsed.error) {
            if (parsed.error.toLowerCase().includes("permission-denied") || parsed.error.toLowerCase().includes("permission") || parsed.error.toLowerCase().includes("insufficient")) {
              friendlyError = "No tienes permisos de escritura en la base de datos de Firebase.";
            } else {
              friendlyError = parsed.error;
            }
          }
        } catch (e) {
          // fallback
        }
      } else {
        friendlyError = message;
      }
      setError(friendlyError);
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleUpdateWhatsappSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhatsappError("");
    setWhatsappSuccess(false);
    setIsSavingWhatsapp(true);

    // Basic cleaning and validation
    const cleaned = whatsappVal.replace(/[^0-9]/g, "");
    if (cleaned.length < 8) {
      setWhatsappError("Por favor ingresa un número de teléfono válido (solo números, incluyendo código de país, ej: 584121234567).");
      setIsSavingWhatsapp(false);
      return;
    }

    try {
      await onUpdateWhatsapp(cleaned);
      setWhatsappSuccess(true);
      setIsWhatsappDirty(false);
    } catch (err: any) {
      const message = err.message || String(err);
      let friendlyError = "Error al actualizar el número de WhatsApp.";
      if (message.startsWith("{") && message.endsWith("}")) {
        try {
          const parsed = JSON.parse(message);
          if (parsed.error) {
            if (parsed.error.toLowerCase().includes("permission-denied") || parsed.error.toLowerCase().includes("permission") || parsed.error.toLowerCase().includes("insufficient")) {
              friendlyError = "No tienes permisos de escritura en la base de datos de Firebase.";
            } else {
              friendlyError = parsed.error;
            }
          }
        } catch (e) {
          // fallback
        }
      } else {
        friendlyError = message;
      }
      setWhatsappError(friendlyError);
    } finally {
      setIsSavingWhatsapp(false);
    }
  };

  const handleUpdateRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError("");
    setRecoverySuccess(false);
    setIsSavingRecovery(true);

    if (!emailVal.trim() || !emailVal.includes("@")) {
      setRecoveryError("Por favor ingresa un correo de recuperación válido.");
      setIsSavingRecovery(false);
      return;
    }

    if (!answerVal.trim()) {
      setRecoveryError("Por favor ingresa una respuesta para la pregunta de seguridad.");
      setIsSavingRecovery(false);
      return;
    }

    try {
      await onUpdateRecoverySettings(emailVal.trim(), questionVal, answerVal.trim());
      setRecoverySuccess(true);
      setIsRecoveryDirty(false);
    } catch (err: any) {
      const message = err.message || String(err);
      let friendlyError = "Error al actualizar la configuración de recuperación.";
      if (message.startsWith("{") && message.endsWith("}")) {
        try {
          const parsed = JSON.parse(message);
          if (parsed.error) {
            if (parsed.error.toLowerCase().includes("permission-denied") || parsed.error.toLowerCase().includes("permission") || parsed.error.toLowerCase().includes("insufficient")) {
              friendlyError = "No tienes permisos de escritura en la base de datos de Firebase.";
            } else {
              friendlyError = parsed.error;
            }
          }
        } catch (e) {
          // fallback
        }
      } else {
        friendlyError = message;
      }
      setRecoveryError(friendlyError);
    } finally {
      setIsSavingRecovery(false);
    }
  };

  const [activeExampleTab, setActiveExampleTab] = useState<"gmail" | "outlook" | "cpanel">("gmail");

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Ajustes del Sistema</h2>
        <p className="text-sm text-slate-500">Configura las credenciales de acceso de seguridad, el WhatsApp de la tienda y el sistema de correos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Change Access PIN */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Cambiar PIN de Acceso</h3>
              <p className="text-xs text-slate-400">Protege tu panel administrativo de accesos</p>
            </div>
          </div>

          <form onSubmit={handleUpdatePinSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">PIN Actual</label>
              <input
                type="password"
                required
                maxLength={4}
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value)}
                placeholder="••••"
                className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Nuevo PIN (4 dígitos)</label>
              <input
                type="password"
                required
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Ej: 1234"
                className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Confirmar Nuevo PIN</label>
              <input
                type="password"
                required
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Ej: 1234"
                className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl text-sm font-semibold transition-all outline-none"
              />
            </div>

            {error && (
              <div className="flex items-center space-x-2 bg-rose-50 border border-rose-100 text-rose-600 text-xs p-3 rounded-xl">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs p-3 rounded-xl">
                <Check className="h-4 w-4 flex-shrink-0" />
                <span>¡PIN actualizado con éxito!</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingPin}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
              >
                {isSavingPin ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Cambiar PIN</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Card 2: WhatsApp Number Configuration */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="bg-green-50 p-2.5 rounded-xl text-green-600">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">WhatsApp de la Tienda</h3>
              <p className="text-xs text-slate-400">Recibe pedidos directos de tus clientes</p>
            </div>
          </div>

          <form onSubmit={handleUpdateWhatsappSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center space-x-1">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>Número de Celular WhatsApp</span>
              </label>
              <input
                type="text"
                required
                value={whatsappVal}
                onChange={(e) => {
                  setWhatsappVal(e.target.value);
                  setIsWhatsappDirty(true);
                }}
                placeholder="Ej: 584121234567"
                className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 rounded-xl text-sm font-semibold transition-all outline-none"
              />
              <p className="text-[10px] text-slate-400 leading-snug">
                Ingresa el código de país completo sin espacios, ni guiones, ni el signo "+". Ejemplo: <strong className="text-slate-600">584121234567</strong> (58 para Venezuela).
              </p>
            </div>

            {whatsappError && (
              <div className="flex items-center space-x-2 bg-rose-50 border border-rose-100 text-rose-600 text-xs p-3 rounded-xl">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{whatsappError}</span>
              </div>
            )}

            {whatsappSuccess && (
              <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs p-3 rounded-xl">
                <Check className="h-4 w-4 flex-shrink-0" />
                <span>¡WhatsApp de la tienda actualizado correctamente!</span>
              </div>
            )}

            <div className="flex justify-end pt-8">
              <button
                type="submit"
                disabled={isSavingWhatsapp}
                className="w-full sm:w-auto px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-green-400 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
              >
                {isSavingWhatsapp ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Guardar WhatsApp</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Card 3: Dual-Factor Security Recovery Configuration */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Recuperación de PIN (Dual-Factor)</h3>
            <p className="text-xs text-slate-400">Configura las opciones de validación e identidad para recuperar tu PIN administrativo en caliente</p>
          </div>
        </div>

        <form onSubmit={handleUpdateRecoverySubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Field 1: Recovery Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center space-x-1">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>Correo de Recuperación</span>
              </label>
              <input
                type="email"
                required
                value={emailVal}
                onChange={(e) => {
                  setEmailVal(e.target.value);
                  setIsRecoveryDirty(true);
                }}
                placeholder="ejemplo@correo.com"
                className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm font-semibold transition-all outline-none"
              />
              <p className="text-[10px] text-slate-400 leading-snug">
                Utilizado en el método de Contactos de Seguridad.
              </p>
            </div>

            {/* Field 2: Security Question dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center space-x-1">
                <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                <span>Pregunta de Seguridad</span>
              </label>
              <select
                value={questionVal}
                onChange={(e) => {
                  setQuestionVal(e.target.value);
                  setIsRecoveryDirty(true);
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm font-semibold transition-all outline-none"
              >
                <option value="¿Cuál es tu producto o receta sin gluten favorita?">¿Cuál es tu producto o receta sin gluten favorita?</option>
                <option value="¿Nombre de tu primera mascota?">¿Nombre de tu primera mascota?</option>
                <option value="¿Ciudad donde naciste?">¿Ciudad donde naciste?</option>
                <option value="¿Cuál es el nombre de tu mejor amigo de la infancia?">¿Cuál es el nombre de tu mejor amigo de la infancia?</option>
                <option value="¿Cuál es el nombre de tu distribuidora o emprendimiento?">¿Cuál es el nombre de tu distribuidora o emprendimiento?</option>
              </select>
              <p className="text-[10px] text-slate-400 leading-snug">
                Selecciona la pregunta que responderás al recuperar tu PIN.
              </p>
            </div>

            {/* Field 3: Security Answer */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center space-x-1">
                <Key className="h-3.5 w-3.5 text-slate-400" />
                <span>Respuesta Secreta</span>
              </label>
              <input
                type="text"
                required
                value={answerVal}
                onChange={(e) => {
                  setAnswerVal(e.target.value);
                  setIsRecoveryDirty(true);
                }}
                placeholder="Tu respuesta secreta..."
                className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm font-semibold transition-all outline-none"
              />
              <p className="text-[10px] text-slate-400 leading-snug">
                Asegúrate de escribirla de forma memorable. No distingue mayúsculas o minúsculas.
              </p>
            </div>

          </div>

          {recoveryError && (
            <div className="flex items-center space-x-2 bg-rose-50 border border-rose-100 text-rose-600 text-xs p-3 rounded-xl">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{recoveryError}</span>
            </div>
          )}

          {recoverySuccess && (
            <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs p-3 rounded-xl">
              <Check className="h-4 w-4 flex-shrink-0" />
              <span>¡Métodos de recuperación actualizados con éxito en Firebase Firestore!</span>
            </div>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button
              type="submit"
              disabled={isSavingRecovery}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
            >
              {isSavingRecovery ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar Recuperación</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Interactive SMTP Configuration Guide Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 gap-4 flex-wrap">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Guía del Servidor de Correo (SMTP)</h3>
              <p className="text-xs text-slate-400">Aprende cómo configurar tu correo para enviar facturas automáticamente</p>
            </div>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-600 font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1">
            <Info className="h-3 w-3" /> Configuración Opcional
          </span>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Para que el sistema envíe los correos reales desde <strong>tu propia dirección de correo</strong> (ej: <em>facturas@tu-negocio.com</em> o <em>tu-correo@gmail.com</em>), debes proveer los datos de tu servidor de correo saliente (<strong>SMTP</strong>). 
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-amber-900">
              <HelpCircle className="h-4 w-4 text-amber-700" />
              <span>¿Qué es todo esto y por qué es seguro con GitHub?</span>
            </div>
            <p className="leading-relaxed">
              Las variables SMTP <strong>no se guardan en el código del navegador</strong> ni se suben a tu repositorio público de GitHub. Se leen únicamente en el servidor mediante el archivo <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env</code> o desde el panel de <strong>Secrets</strong> de tu plataforma de alojamiento (como AI Studio, Heroku, Cloud Run o Vercel). Esto significa que <strong>nunca se expondrán tus contraseñas reales</strong> a terceros.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Concepto de Variables SMTP</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Server className="h-3 w-3" /> SMTP_HOST
                </span>
                <p className="text-xs font-bold text-slate-800">Servidor Saliente</p>
                <p className="text-[10px] text-slate-400">Es la dirección de la computadora de tu proveedor encargada de enviar correos.</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Server className="h-3 w-3" /> SMTP_PORT
                </span>
                <p className="text-xs font-bold text-slate-800">Puerto Seguro</p>
                <p className="text-[10px] text-slate-400">Número de conexión. Usualmente es <strong>587</strong> (TLS) o <strong>465</strong> (SSL).</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Mail className="h-3 w-3" /> SMTP_USER
                </span>
                <p className="text-xs font-bold text-slate-800">Usuario / Correo</p>
                <p className="text-[10px] text-slate-400">Tu dirección de correo electrónico completa desde la que saldrán las facturas.</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Key className="h-3 w-3" /> SMTP_PASS
                </span>
                <p className="text-xs font-bold text-slate-800">Contraseña Segura</p>
                <p className="text-[10px] text-slate-400">Tu contraseña o, en el caso de Gmail, una <strong>Contraseña de Aplicación</strong> de 16 caracteres.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Ejemplos de configuración reales</span>
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveExampleTab("gmail")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    activeExampleTab === "gmail"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  Gmail
                </button>
                <button
                  onClick={() => setActiveExampleTab("outlook")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    activeExampleTab === "outlook"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  Outlook / Hotmail
                </button>
                <button
                  onClick={() => setActiveExampleTab("cpanel")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    activeExampleTab === "cpanel"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  Dominio Propio (cPanel / Hostinger)
                </button>
              </div>
            </div>

            {/* TAB CONTENT */}
            <div className="bg-slate-950 text-slate-100 p-5 rounded-2xl font-mono text-[11px] leading-relaxed relative shadow-inner">
              <div className="absolute top-3 right-3 text-[10px] font-black tracking-widest text-blue-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full uppercase">
                {activeExampleTab === "gmail" && "Google Suite"}
                {activeExampleTab === "outlook" && "Microsoft 365"}
                {activeExampleTab === "cpanel" && "Email Profesional"}
              </div>

              {activeExampleTab === "gmail" && (
                <div className="space-y-2">
                  <p className="text-slate-400"># 1. Configuración para usar una cuenta de Gmail de Google:</p>
                  <p className="text-slate-400"># IMPORTANTE: No uses tu clave personal. Debes ir a tu Cuenta de Google &gt; Seguridad &gt; Verificación en 2 pasos &gt; "Contraseñas de aplicación" para generar una clave de 16 letras.</p>
                  <p><span className="text-pink-400">SMTP_HOST</span>=<span className="text-emerald-300">"smtp.gmail.com"</span></p>
                  <p><span className="text-pink-400">SMTP_PORT</span>=<span className="text-amber-300">587</span></p>
                  <p><span className="text-pink-400">SMTP_USER</span>=<span className="text-emerald-300">"singlutenpzo@gmail.com"</span></p>
                  <p><span className="text-pink-400">SMTP_PASS</span>=<span className="text-emerald-300">"abcd efgh ijkl mnop"</span> <span className="text-slate-500"># Contraseña de aplicación generada</span></p>
                </div>
              )}

              {activeExampleTab === "outlook" && (
                <div className="space-y-2">
                  <p className="text-slate-400"># 2. Configuración para Outlook, Hotmail o Live:</p>
                  <p><span className="text-pink-400">SMTP_HOST</span>=<span className="text-emerald-300">"smtp-mail.outlook.com"</span></p>
                  <p><span className="text-pink-400">SMTP_PORT</span>=<span className="text-amber-300">587</span></p>
                  <p><span className="text-pink-400">SMTP_USER</span>=<span className="text-emerald-300">"tu-negocio@outlook.com"</span></p>
                  <p><span className="text-pink-400">SMTP_PASS</span>=<span className="text-emerald-300">"TuClaveDeOutlookAqui"</span></p>
                </div>
              )}

              {activeExampleTab === "cpanel" && (
                <div className="space-y-2">
                  <p className="text-slate-400"># 3. Configuración para correos corporativos con dominio propio (Hostinger, cPanel, GoDaddy):</p>
                  <p><span className="text-pink-400">SMTP_HOST</span>=<span className="text-emerald-300">"smtp.hostinger.com"</span> <span className="text-slate-500"># o mail.tu-dominio.com</span></p>
                  <p><span className="text-pink-400">SMTP_PORT</span>=<span className="text-amber-300">465</span> <span className="text-slate-500"># o 587 si usa TLS</span></p>
                  <p><span className="text-pink-400">SMTP_USER</span>=<span className="text-emerald-300">"facturas@singlutenpzo.com"</span></p>
                  <p><span className="text-pink-400">SMTP_PASS</span>=<span className="text-emerald-300">"ClaveCreadaEnTuCPanel"</span></p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
