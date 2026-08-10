import React, { useState } from "react";
import { Lock, X, AlertCircle, KeyRound, Smartphone, CheckCircle2, ArrowLeft, Send, Sparkles, HelpCircle, Mail, ShieldAlert } from "lucide-react";
import logoImg from "../assets/images/singlutenpzo_logo_1785767632220.jpg";

interface AdminLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  savedPin: string;
  registeredWhatsapp: string;
  recoveryEmail: string;
  securityQuestion: string;
  securityAnswer: string;
  onResetPin?: (newPin: string) => Promise<void>;
}

export default function AdminLogin({
  isOpen,
  onClose,
  onLoginSuccess,
  savedPin,
  registeredWhatsapp,
  recoveryEmail,
  securityQuestion,
  securityAnswer,
  onResetPin
}: AdminLoginProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  
  // Recovery States
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryMethod, setRecoveryMethod] = useState<"question" | "email">("question");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [recoveryAnswerInput, setRecoveryAnswerInput] = useState("");
  const [recoveryEmailInput, setRecoveryEmailInput] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  
  // New PIN Reset States
  const [isResetting, setIsResetting] = useState(false);
  const [newPinInput, setNewPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    setError("");
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin === savedPin) {
        onLoginSuccess();
        resetAllStates();
        onClose();
      } else if (newPin.length === 4) {
        setError("PIN Incorrecto. Intenta de nuevo.");
        setTimeout(() => setPin(""), 600);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  const resetAllStates = () => {
    setPin("");
    setError("");
    setShowRecovery(false);
    setRecoveryPhone("");
    setRecoveryAnswerInput("");
    setRecoveryEmailInput("");
    setRecoveryError("");
    setIsVerified(false);
    setIsResetting(false);
    setNewPinInput("");
    setConfirmPinInput("");
    setResetSuccess(false);
    setResetLoading(false);
  };

  // Standardize phone strings by extracting digits only
  const cleanPhone = (phoneStr: string) => {
    return phoneStr.replace(/[^0-9]/g, "");
  };

  // Dual-Factor verification handler
  const handleVerifyIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError("");
    
    const cleanedInputPhone = cleanPhone(recoveryPhone);
    const cleanedRegisteredPhone = cleanPhone(registeredWhatsapp);

    if (!cleanedInputPhone) {
      setRecoveryError("Por favor ingresa el número de WhatsApp de la tienda.");
      return;
    }

    // 1. Verify WhatsApp phone number match (essential for both methods)
    const isPhoneValid = cleanedInputPhone === cleanedRegisteredPhone || 
                         (cleanedInputPhone.length >= 10 && cleanedRegisteredPhone.endsWith(cleanedInputPhone));

    if (!isPhoneValid) {
      setRecoveryError("El número de WhatsApp de la tienda no coincide con el registrado en el sistema.");
      return;
    }

    // 2. Perform validation depending on active method
    if (recoveryMethod === "question") {
      if (!recoveryAnswerInput.trim()) {
        setRecoveryError("Por favor ingresa la respuesta a tu pregunta de seguridad.");
        return;
      }
      
      const isAnswerValid = recoveryAnswerInput.trim().toLowerCase() === securityAnswer.trim().toLowerCase();
      if (isAnswerValid) {
        setIsVerified(true);
        setIsResetting(true); // Auto-navigate to reset view
      } else {
        setRecoveryError("La respuesta a la pregunta secreta de seguridad es incorrecta.");
      }
    } else {
      if (!recoveryEmailInput.trim()) {
        setRecoveryError("Por favor ingresa tu correo electrónico de recuperación.");
        return;
      }

      const isEmailValid = recoveryEmailInput.trim().toLowerCase() === recoveryEmail.trim().toLowerCase();
      if (isEmailValid) {
        setIsVerified(true);
        setIsResetting(true); // Auto-navigate to reset view
      } else {
        setRecoveryError("El correo electrónico de recuperación ingresado es incorrecto.");
      }
    }
  };

  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError("");
    
    const cleanedNewPin = newPinInput.replace(/[^0-9]/g, "");
    const cleanedConfirmPin = confirmPinInput.replace(/[^0-9]/g, "");

    if (cleanedNewPin.length !== 4) {
      setRecoveryError("El nuevo PIN debe ser exactamente de 4 dígitos numéricos.");
      return;
    }

    if (cleanedNewPin !== cleanedConfirmPin) {
      setRecoveryError("Las contraseñas PIN ingresadas no coinciden.");
      return;
    }

    if (onResetPin) {
      setResetLoading(true);
      try {
        await onResetPin(cleanedNewPin);
        setResetSuccess(true);
        setTimeout(() => {
          resetAllStates();
          onClose();
        }, 2200);
      } catch (err: any) {
        setRecoveryError(err.message || "Error al actualizar el PIN en la base de datos de Firestore.");
      } finally {
        setResetLoading(false);
      }
    } else {
      setRecoveryError("La función de reajuste de PIN no se encuentra disponible.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-blue-900/40 rounded-2xl sm:rounded-3xl w-full max-w-sm p-4 sm:p-6 my-auto max-h-[92vh] overflow-y-auto shadow-2xl relative transition-all duration-300">
        
        {/* Glow Effects */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => {
            resetAllStates();
            onClose();
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-full transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {!showRecovery ? (
          /* STANDARD PIN PAD LOGIN VIEW */
          <div>
            <div className="flex flex-col items-center mb-6">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-xl border border-amber-400/40 mb-3 bg-white p-2 flex-shrink-0">
                <img
                  src={logoImg}
                  alt="SinGlutenpzo Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Acceso Administrador</h2>
              <p className="text-xs text-slate-400 mt-1">Ingresa el PIN de seguridad de 4 dígitos</p>
            </div>

            {/* Display dots for PIN */}
            <div className="flex justify-center space-x-3 mb-6">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                    index < pin.length
                      ? "bg-blue-500 border-blue-400 scale-110 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                      : "border-slate-700 bg-transparent"
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-3 py-2 rounded-xl mb-6 animate-bounce justify-center">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Numeric keypad */}
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  onClick={() => handleKeyPress(num)}
                  className="h-14 bg-slate-800/40 hover:bg-blue-600/20 active:bg-blue-600 border border-slate-800/80 active:border-blue-500 rounded-2xl text-xl font-bold text-white transition-all flex items-center justify-center shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handleDelete}
                className="h-14 bg-slate-800/20 hover:bg-rose-500/10 rounded-2xl text-xs font-semibold text-rose-400 transition-all flex items-center justify-center border border-transparent hover:border-rose-500/20"
              >
                Borrar
              </button>
              <button
                key="0"
                onClick={() => handleKeyPress("0")}
                className="h-14 bg-slate-800/40 hover:bg-blue-600/20 active:bg-blue-600 border border-slate-800/80 active:border-blue-500 rounded-2xl text-xl font-bold text-white transition-all flex items-center justify-center shadow-sm"
              >
                0
              </button>
              <button
                onClick={() => setPin("")}
                className="h-14 bg-slate-800/20 hover:bg-slate-800 rounded-2xl text-xs font-semibold text-slate-400 transition-all flex items-center justify-center"
              >
                Limpiar
              </button>
            </div>

            {/* Forget PIN button */}
            <button
              onClick={() => {
                setShowRecovery(true);
                setRecoveryError("");
              }}
              className="mt-6 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors block text-center w-full uppercase tracking-wider hover:underline"
            >
              ¿Olvidaste tu PIN de seguridad?
            </button>
          </div>
        ) : (
          /* SECURITY RECOVERY VIEW */
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center space-x-2 text-slate-400 mb-2">
              <button 
                onClick={() => {
                  setShowRecovery(false);
                  setRecoveryError("");
                  setIsVerified(false);
                  setIsResetting(false);
                }} 
                className="hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold uppercase tracking-wider">Volver al ingreso PIN</span>
            </div>

            <div className="text-center space-y-1">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-950 flex items-center justify-center border border-blue-500/20 mb-2">
                <KeyRound className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-extrabold text-white">Seguridad Dual-Factor</h3>
              <p className="text-xs text-slate-400 px-2 leading-relaxed">
                {!isVerified 
                  ? "Verifica tu identidad usando uno de los dos canales de recuperación de seguridad." 
                  : "Identidad validada. Configura tu nuevo PIN."}
              </p>
            </div>

            {recoveryError && (
              <div className="flex items-start space-x-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-xl">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{recoveryError}</span>
              </div>
            )}

            {!isVerified ? (
              /* Recovery Step 1: Selector Tabs and Verification Forms */
              <div className="space-y-4">
                {/* Switch Tabs */}
                <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryMethod("question");
                      setRecoveryError("");
                    }}
                    className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 ${
                      recoveryMethod === "question" 
                        ? "bg-blue-600 text-white shadow-sm" 
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <HelpCircle className="h-3 w-3" />
                    Pregunta Secreta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryMethod("email");
                      setRecoveryError("");
                    }}
                    className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 ${
                      recoveryMethod === "email" 
                        ? "bg-blue-600 text-white shadow-sm" 
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Mail className="h-3 w-3" />
                    Contacto
                  </button>
                </div>

                <form onSubmit={handleVerifyIdentity} className="space-y-4">
                  {/* Common Field: Store WhatsApp number */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                      Paso 1: WhatsApp de la Tienda
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                        <Smartphone className="h-4 w-4" />
                      </span>
                      <input
                        type="tel"
                        placeholder="Ej: 584121234567"
                        value={recoveryPhone}
                        onChange={(e) => setRecoveryPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-700 transition-all font-mono"
                        required
                      />
                    </div>
                  </div>

                  {/* Method A: Secret Question */}
                  {recoveryMethod === "question" ? (
                    <div className="space-y-4 pt-1 border-t border-slate-800/60">
                      <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-xl space-y-1.5">
                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest block">
                          Pregunta de Seguridad
                        </span>
                        <p className="text-xs font-bold text-slate-200">
                          {securityQuestion || "¿Cuál es tu producto o receta sin gluten favorita?"}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                          Paso 2: Respuesta Secreta
                        </label>
                        <input
                          type="text"
                          placeholder="Tu respuesta secreta..."
                          value={recoveryAnswerInput}
                          onChange={(e) => setRecoveryAnswerInput(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-700 transition-all"
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    /* Method B: Recovery Email */
                    <div className="space-y-4 pt-1 border-t border-slate-800/60">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                          Paso 2: Correo de Recuperación
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                            <Mail className="h-4 w-4" />
                          </span>
                          <input
                            type="email"
                            placeholder="Ej: admin@singlutenpzo.com"
                            value={recoveryEmailInput}
                            onChange={(e) => setRecoveryEmailInput(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-700 transition-all"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    Verificar y Restablecer
                  </button>
                </form>
              </div>
            ) : (
              /* Recovery Step 2: HOT RESET (Verification Successful, Input new PIN) */
              <div className="space-y-4">
                <form onSubmit={handleResetPinSubmit} className="space-y-4">
                  {resetSuccess ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 text-center space-y-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-500/30 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-6 w-6 text-emerald-400 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-white">¡PIN Actualizado en Caliente!</h4>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          El nuevo código PIN de seguridad ha sido guardado exitosamente en la nube de Firestore.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] p-3 rounded-xl flex gap-2 items-start">
                        <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span className="leading-normal">Identidad verificada. Introduce un nuevo PIN administrativo de 4 dígitos.</span>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                            Nuevo PIN de 4 Dígitos
                          </label>
                          <input
                            type="password"
                            pattern="[0-9]*"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="••••"
                            value={newPinInput}
                            onChange={(e) => setNewPinInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 text-center text-xl font-black font-mono text-white tracking-widest placeholder-slate-800 transition-all"
                            required
                            autoFocus
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                            Confirmar Nuevo PIN
                          </label>
                          <input
                            type="password"
                            pattern="[0-9]*"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="••••"
                            value={confirmPinInput}
                            onChange={(e) => setConfirmPinInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 text-center text-xl font-black font-mono text-white tracking-widest placeholder-slate-800 transition-all"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={resetLoading}
                        className={`w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 ${
                          resetLoading ? "opacity-55 cursor-not-allowed" : "active:scale-95"
                        }`}
                      >
                        {resetLoading ? "Guardando en Firestore..." : "Confirmar y Guardar PIN"}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
