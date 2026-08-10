import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Keep track of models that have failed recently with transient/quota errors
  const modelCooldowns = new Map<string, number>();
  const COOLDOWN_DURATION = 15 * 60 * 1000; // 15 minutes

  // Increase limits to handle PDF/Excel base64 files
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Initialize Gemini Client
  let ai: GoogleGenAI | null = null;
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // API Route to parse files (Excel, PDF, Text) using Gemini API
  app.post("/api/parse-file", async (req, res) => {
    try {
      const { fileBase64, mimeType, fileText, parseType } = req.body;

      if (!ai) {
        return res.status(500).json({
          error: "Gemini API client is not initialized. Please configure GEMINI_API_KEY in Secrets."
        });
      }

      let systemPrompt = "";
      if (parseType === "inventory_or_purchases") {
        systemPrompt = `
          Eres un asistente experto en contabilidad e inventario para 'SinGlutenpzo (Oriven Distribuidora de Alimentos)' de venta de productos sin gluten y postres saludables.
          Analiza el archivo, tabla de Excel, CSV o texto provisto que contiene una lista de compras de mercancía o inventario.
          
          REGLA ABSOLUTA DE CATEGORIZACIÓN:
          - Si el archivo, tabla o texto contiene una columna, celda o mención explícita sobre la categoría del producto (por ejemplo: "Categoría", "Tipo", "Clase", "Grupo", etc.), DEBES respetar estrictamente la clasificación del usuario.
          - Si el usuario clasificó un producto que normalmente es un accesorio (por ejemplo un forro, cable, cargador, audífono) dentro de la categoría "celulares", "celular", "equipos", "equipos de tienda", "teléfonos", etc., DEBES clasificarlo como "equipos" en la respuesta. No intentes corregirlo basándote en el nombre del producto.
          
          MUY IMPORTANTE PARA EL MAPEO DE CATEGORÍAS:
          - Mapea el valor de la categoría a una de estas dos categorías exactas:
            1. "equipos": para teléfonos inteligentes, celulares, tabletas, iPhones, dispositivos principales, o si la columna de categoría dice cosas como "celular", "celulares", "equipos", "teléfonos", "teléfono", "smartphone", etc.
            2. "accesorios": para carcasas, estuches, forros, cases, protectores de pantalla, vidrios templados, cargadores, cables, audífonos, repuestos, repuestos exclusivos, o si la columna de categoría dice cosas como "accesorios", "accesorio", "repuestos", "tienda", etc.
          - Si y solo si el archivo no tiene una columna o indicación explícita de categoría, utiliza tu conocimiento experto para clasificar el producto basándote en su nombre (por ejemplo, "iPhone 15 Pro" se clasifica como "equipos", y "Cargador Carga Rápida" se clasifica como "accesorios").

          Debes extraer todos los productos y devolver un JSON con la estructura exacta:
          {
            "items": [
              {
                "name": "Nombre del producto de forma clara",
                "category": "equipos" o "accesorios",
                "costPrice": número de costo en $ (si se menciona o deduce, sino dejar null),
                "salePrice": número de precio de venta en $ (si se menciona o deduce, sino dejar null),
                "wholesalePrice": número de precio al mayor en $ (si se menciona o deduce, sino dejar null),
                "creditPrice": número de precio a crédito en $ (si se menciona o deduce, sino dejar null),
                "referenceProfit": número de ganancia de referencia en $ (si no tiene costo y solo se tiene ganancia, de lo contrario dejar null o 0),
                "stock": número de stock/cantidad adquirida (si no se especifica, por defecto 0)
              }
            ]
          }
          Importante:
          - No incluyas explicaciones ni bloques de código markdown (\`\`\`json).
          - Devuelve únicamente el string JSON válido.
          - Si faltan datos de precio o costo, intenta deducirlos o pon un valor estimado razonable basándote en la información dada, pero si el stock no viene o es nulo o vacío pon 0 por defecto.
        `;
      } else if (parseType === "expenses_or_payroll") {
        systemPrompt = `
          Eres un asistente experto en contabilidad para 'SinGlutenpzo (Oriven Distribuidora de Alimentos)'.
          Analiza el archivo o texto provisto que contiene una lista de gastos o nómina/pagos de personal.
          Debes extraer los gastos y devolver un JSON con la estructura exacta:
          {
            "expenses": [
              {
                "description": "Descripción clara del gasto o pago de personal",
                "amount": número de monto en $,
                "category": "personal" (para nómina, salarios, comisiones), "servicios" (agua, luz, internet), "alquiler" (renta del local), o "otros" (cualquier otro gasto),
                "date": "YYYY-MM-DD" (la fecha en que se realizó o se indica, usa la fecha actual 2026-07-03 si no se indica)
              }
            ]
          }
          Importante:
          - No incluyas explicaciones ni bloques de código markdown.
          - Devuelve únicamente el string JSON válido.
        `;
      } else if (parseType === "provider_invoice") {
        systemPrompt = `
          Eres un asistente experto en contabilidad para 'SinGlutenpzo (Oriven Distribuidora de Alimentos)'.
          Analiza el archivo o texto provisto que contiene facturas de compras de proveedores, deudas o créditos.
          Debes extraer las compras de proveedores y devolver un JSON con la estructura exacta:
          {
            "purchases": [
              {
                "invoiceNumber": "Número de factura o referencia de la compra",
                "provider": "Nombre del proveedor o tienda de origen",
                "date": "YYYY-MM-DD" (fecha de emisión de la factura de compra, usa la fecha actual 2026-07-03 si no se indica),
                "totalAmount": número del monto total de la factura en $,
                "type": "contado" o "credito" (si se indica que es deuda o crédito, pon "credito". Si indica pagado inmediatamente o cash, "contado"),
                "status": "pagado" o "pendiente" (las de crédito deben estar "pendiente" por defecto, las de contado "pagado")
              }
            ]
          }
          Importante:
          - No incluyas explicaciones ni bloques de código markdown.
          - Devuelve únicamente el string JSON válido.
        `;
      } else if (parseType === "clients_or_debts") {
        systemPrompt = `
          Eres un asistente experto en contabilidad para 'SinGlutenpzo (Oriven Distribuidora de Alimentos)'.
          Analiza el archivo o texto provisto que contiene una lista de clientes, sus datos personales (nombre, teléfono, cédula/identificación, dirección, correo) y deudas pendientes / saldos iniciales.
          Debes extraer los clientes y deudas, y devolver un JSON con la estructura exacta:
          {
            "clients": [
              {
                "name": "Nombre completo del cliente",
                "phone": "Teléfono del cliente (ej. +584120000000 o N/A si no se especifica)",
                "cedula": "Cédula, DNI o identificación (si no se especifica, dejar vacío o usar N/A)",
                "address": "Dirección física (si no se especifica, dejar N/A)",
                "email": "Correo electrónico válido (si no tiene o no es válido, dejar vacío)",
                "debt": número de la deuda pendiente o saldo inicial en $ (si no tiene deuda o ya pagó, usar 0),
                "debtDetails": "Descripción opcional de la deuda (ej. Saldo inicial, Deuda de mercancía, etc.)"
              }
            ]
          }
          Importante:
          - No incluyas explicaciones ni bloques de código markdown.
          - Devuelve únicamente el string JSON válido.
        `;
      } else if (parseType === "providers") {
        systemPrompt = `
          Eres un asistente experto en contabilidad para 'SinGlutenpzo (Oriven Distribuidora de Alimentos)'.
          Analiza el archivo o texto provisto que contiene una lista de proveedores con sus datos de contacto y detalles comerciales.
          Debes extraer los proveedores y devolver un JSON con la estructura exacta:
          {
            "providers": [
              {
                "name": "Nombre completo del proveedor o distribuidora",
                "phone": "Teléfono del proveedor (ej. +584120000000 o N/A si no se especifica)",
                "email": "Correo electrónico del proveedor (si no se especifica, dejar vacío)",
                "address": "Dirección física o local (si no se especifica, dejar N/A)",
                "rif": "RIF o identificación comercial/fiscal (si no se especifica, dejar vacío)",
                "notes": "Notas adicionales o tipo de mercancía que provee"
              }
            ]
          }
          Importante:
          - No incluyas explicaciones ni bloques de código markdown.
          - Devuelve únicamente el string JSON válido.
        `;
      } else {
        return res.status(400).json({ error: "Invalid parseType" });
      }

      // Prepare Gemini parts
      const parts: any[] = [{ text: systemPrompt }];

      if (fileBase64 && mimeType) {
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: fileBase64
          }
        });
      }

      if (fileText) {
        parts.push({ text: `Contenido de texto o datos copiados:\n${fileText}` });
      }

      // Prepare schema for structural JSON output validation
      let schema: any = undefined;
      if (parseType === "inventory_or_purchases") {
        schema = {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Nombre del producto de forma clara" },
                  category: { type: Type.STRING, description: "Debe ser exactamente 'equipos' o 'accesorios'" },
                  costPrice: { type: Type.NUMBER, description: "Costo en $ del producto. Omitir propiedad por completo si no se conoce (no usar null)" },
                  salePrice: { type: Type.NUMBER, description: "Precio de venta en $ del producto. Omitir propiedad por completo si no se conoce (no usar null)" },
                  wholesalePrice: { type: Type.NUMBER, description: "Precio de venta al mayor en $ del producto. Omitir propiedad si no se conoce (no usar null)" },
                  creditPrice: { type: Type.NUMBER, description: "Precio de venta a crédito en $ del producto. Omitir propiedad si no se conoce (no usar null)" },
                  referenceProfit: { type: Type.NUMBER, description: "Ganancia de referencia en $. Omitir propiedad por completo si no se conoce o es 0 (no usar null)" },
                  stock: { type: Type.INTEGER, description: "Cantidad de stock, por defecto 0 si no se indica" }
                },
                required: ["name", "category"]
              }
            }
          },
          required: ["items"]
        };
      } else if (parseType === "expenses_or_payroll") {
        schema = {
          type: Type.OBJECT,
          properties: {
            expenses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING, description: "Descripción clara del gasto o pago de personal" },
                  amount: { type: Type.NUMBER, description: "Monto del gasto en $" },
                  category: { type: Type.STRING, description: "Debe ser 'personal', 'servicios', 'alquiler' o 'otros'" },
                  date: { type: Type.STRING, description: "Fecha en formato YYYY-MM-DD. Si no se indica, usar la fecha actual 2026-07-03." }
                },
                required: ["description", "amount", "category", "date"]
              }
            }
          },
          required: ["expenses"]
        };
      } else if (parseType === "provider_invoice") {
        schema = {
          type: Type.OBJECT,
          properties: {
            purchases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  invoiceNumber: { type: Type.STRING, description: "Número de factura o referencia de la compra" },
                  provider: { type: Type.STRING, description: "Nombre del proveedor o tienda de origen" },
                  date: { type: Type.STRING, description: "Fecha de emisión en formato YYYY-MM-DD. Si no se indica, usar la fecha actual 2026-07-03." },
                  totalAmount: { type: Type.NUMBER, description: "Monto total de la factura en $" },
                  type: { type: Type.STRING, description: "Tipo: 'contado' o 'credito'" },
                  status: { type: Type.STRING, description: "Estado: 'pagado' o 'pendiente'" }
                },
                required: ["invoiceNumber", "provider", "date", "totalAmount", "type", "status"]
              }
            }
          },
          required: ["purchases"]
        };
      } else if (parseType === "clients_or_debts") {
        schema = {
          type: Type.OBJECT,
          properties: {
            clients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Nombre completo del cliente" },
                  phone: { type: Type.STRING, description: "Teléfono o N/A" },
                  cedula: { type: Type.STRING, description: "Cédula/identificación o vacío" },
                  address: { type: Type.STRING, description: "Dirección física o N/A" },
                  email: { type: Type.STRING, description: "Email válido o vacío" },
                  debt: { type: Type.NUMBER, description: "Monto de la deuda o 0" },
                  debtDetails: { type: Type.STRING, description: "Detalles o descripción del saldo" }
                },
                required: ["name", "phone", "cedula", "debt"]
              }
            }
          },
          required: ["clients"]
        };
      } else if (parseType === "providers") {
        schema = {
          type: Type.OBJECT,
          properties: {
            providers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Nombre completo del proveedor" },
                  phone: { type: Type.STRING, description: "Teléfono o N/A" },
                  email: { type: Type.STRING, description: "Email válido o vacío" },
                  address: { type: Type.STRING, description: "Dirección o N/A" },
                  rif: { type: Type.STRING, description: "RIF o identificación" },
                  notes: { type: Type.STRING, description: "Notas o comentarios" }
                },
                required: ["name"]
              }
            }
          },
          required: ["providers"]
        };
      }

      const baseModelsToTry = [
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-2.5-flash-lite",
        "gemini-flash-latest"
      ];

      // Sort models dynamically so healthy models are tried first
      const now = Date.now();
      const modelsToTry = [...baseModelsToTry].sort((a, b) => {
        const cooldownA = modelCooldowns.get(a) || 0;
        const cooldownB = modelCooldowns.get(b) || 0;
        const isCooldownA = cooldownA > now;
        const isCooldownB = cooldownB > now;

        if (isCooldownA && !isCooldownB) return 1;
        if (!isCooldownA && isCooldownB) return -1;
        return 0; // maintain original default order if both have same status
      });

      console.log("Model selection order for this request:", modelsToTry.map(m => {
        const cd = modelCooldowns.get(m) || 0;
        return cd > now ? `${m} (cooldown: ${Math.round((cd - now) / 1000)}s)` : m;
      }));

      let response;
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        let success = false;
        // Try up to 2 times per model to fallback faster if a model is heavily throttled or unavailable
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents: { parts: parts },
              config: {
                responseMimeType: "application/json",
                responseSchema: schema
              }
            });
            success = true;
            break;
          } catch (err: any) {
            lastError = err;
            const errMsg = err.message || String(err);
            console.warn(`Attempt ${attempt} on model ${modelName} failed: ${errMsg}`);

            const isTransient = errMsg.includes("503") || 
                                errMsg.includes("UNAVAILABLE") || 
                                errMsg.includes("429") || 
                                errMsg.includes("demand") ||
                                errMsg.includes("limit") ||
                                errMsg.includes("quota") ||
                                errMsg.includes("fetch failed");

            if (isTransient) {
              const isQuotaOrLimit = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("limit");
              // For quota errors, we can use an even longer cooldown (e.g. 30 minutes)
              const cooldownTime = isQuotaOrLimit ? Date.now() + (30 * 60 * 1000) : Date.now() + COOLDOWN_DURATION;
              modelCooldowns.set(modelName, cooldownTime);
              console.log(`Cooling down model ${modelName} due to ${isQuotaOrLimit ? "quota limit" : "transient"} error.`);
              
              if (isQuotaOrLimit) {
                console.log(`Model ${modelName} is rate-limited/quota-exhausted. Skipping further retries and falling back immediately.`);
                break;
              }
            }

            if (isTransient && attempt < 2) {
              const delay = 800;
              console.log(`Transient error detected, retrying model ${modelName} in ${delay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
              break;
            }
          }
        }
        if (success && response) {
          break;
        } else {
          // If the model failed and we have more models to try, pause briefly before falling back to the next model
          console.log(`Model ${modelName} failed. Pausing 300ms before falling back to the next model...`);
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      if (!response) {
        throw new Error(`All Gemini models failed. Last error: ${lastError?.message || lastError}`);
      }

      const responseText = response.text || "";
      let cleanJson = responseText.trim();
      
      // Robust JSON extraction fallback in case there are markdown backticks or extra text
      if (cleanJson.includes("```")) {
        const match = cleanJson.match(/```(?:json)?([\s\S]*?)```/);
        if (match && match[1]) {
          cleanJson = match[1].trim();
        }
      }
      
      // Secondary fallback if it still starts/ends with backticks
      if (cleanJson.startsWith("```json")) {
        cleanJson = cleanJson.substring(7);
      }
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.substring(3);
      }
      if (cleanJson.endsWith("```")) {
        cleanJson = cleanJson.substring(0, cleanJson.length - 3);
      }
      cleanJson = cleanJson.trim();
      cleanJson = cleanJson.trim();

      try {
        const parsedData = JSON.parse(cleanJson);
        res.json(parsedData);
      } catch (parseErr) {
        console.error("Failed to parse JSON from Gemini:", cleanJson);
        res.status(500).json({
          error: "Error al procesar la respuesta de la IA. No se obtuvo un formato de datos válido.",
          rawText: responseText
        });
      }

    } catch (error: any) {
      console.error("Error in /api/parse-file:", error);
      res.status(500).json({ error: error.message || "Error al procesar el archivo con Gemini" });
    }
  });

  // API Route for Recipe Costing & AI Pricing Escandallo
  app.post("/api/recipe-costing-ai", async (req, res) => {
    try {
      const {
        recipeName,
        yieldQuantity,
        yieldUnit,
        preparationTimeMinutes,
        category,
        ingredients,
        packagingCost,
        laborCost,
        overheadPercentage,
        desiredMarginPercentage,
        rawMaterialsContext
      } = req.body;

      if (!ai) {
        return res.status(500).json({
          error: "El servicio de Inteligencia Artificial Gemini no está disponible o falta la API Key."
        });
      }

      if (!recipeName || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({
          error: "Faltan datos obligatorios de la receta o la lista de ingredientes está vacía."
        });
      }

      const prompt = `
        Eres un experto pastelero, maestro panadero y consultor de costos y finanzas en gastronomía sin gluten de la empresa 'SinGlutenpzo - Oriven Distribuidora de Alimentos J-40633400-6' en Puerto Ordaz, Venezuela.
        
        Evalúa y analiza la siguiente RECETA Y ESCANDALLO DE COSTOS:

        - Nombre de la Receta: "${recipeName}"
        - Rendimiento / Porciones: ${yieldQuantity || 1} ${yieldUnit || "porciones/unidades"}
        - Categoría: "${category || "General"}"
        - Tiempo de preparación estimado: ${preparationTimeMinutes || 30} minutos

        INGREDIENTES Y COSTOS BASE:
        ${JSON.stringify(ingredients, null, 2)}

        GASTOS ADICIONALES Y COSTOS DE OPERACIÓN:
        - Costo de Empaque (cajas, bolsas, celofán, etiquetas): $${packagingCost || 0}
        - Mano de obra directa: $${laborCost || 0}
        - Porcentaje de Gastos Fijos (luz, agua, gas, alquiler de cocina): ${overheadPercentage || 0}%
        - Margen de ganancia bruto deseado: ${desiredMarginPercentage || 50}%

        ${rawMaterialsContext && rawMaterialsContext.length > 0 ? `MATERIAS PRIMAS DISPONIBLES EN STOCK DE ALMACÉN:\n${JSON.stringify(rawMaterialsContext, null, 2)}` : ""}

        TAREA:
        1. Valida el costo total de la receta y calcula exactamente el costo por porción o unidad.
        2. Determina el precio de venta sugerido al público (detal) basado en el margen deseado (${desiredMarginPercentage || 50}%) y la competitividad en el mercado venezolano de productos 100% sin gluten.
        3. Proporciona precios escalonados sugeridos: Detal, Mayor y Crédito.
        4. Otorga una puntuación de rentabilidad de 1 a 100.
        5. Ofrece sugerencias prácticas de optimización de costos de ingredientes, merma y empaque.
        6. Redacta un resumen analítico ejecutivo claro y profesional en español.

        Responde ÚNICAMENTE en formato JSON.
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          totalIngredientsCost: { type: Type.NUMBER },
          overheadCost: { type: Type.NUMBER },
          totalRecipeCost: { type: Type.NUMBER },
          costPerUnit: { type: Type.NUMBER },
          suggestedSalePricePerUnit: { type: Type.NUMBER },
          suggestedBatchSalePrice: { type: Type.NUMBER },
          profitabilityScore: { type: Type.INTEGER },
          summary: { type: Type.STRING },
          marketRecommendation: { type: Type.STRING },
          pricingTiers: {
            type: Type.OBJECT,
            properties: {
              wholesale: { type: Type.NUMBER },
              retail: { type: Type.NUMBER },
              credit: { type: Type.NUMBER }
            },
            required: ["wholesale", "retail", "credit"]
          },
          costReductionTips: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          rawMaterialUsageSummary: { type: Type.STRING }
        },
        required: [
          "totalIngredientsCost",
          "overheadCost",
          "totalRecipeCost",
          "costPerUnit",
          "suggestedSalePricePerUnit",
          "profitabilityScore",
          "summary",
          "marketRecommendation",
          "pricingTiers",
          "costReductionTips"
        ]
      };

      const baseModelsToTry = [
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-flash-latest"
      ];

      const now = Date.now();
      const modelsToTry = [...baseModelsToTry].sort((a, b) => {
        const cooldownA = modelCooldowns.get(a) || 0;
        const cooldownB = modelCooldowns.get(b) || 0;
        const isCooldownA = cooldownA > now;
        const isCooldownB = cooldownB > now;
        if (isCooldownA && !isCooldownB) return 1;
        if (!isCooldownA && isCooldownB) return -1;
        return 0;
      });

      let response;
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: schema
            }
          });
          if (response) break;
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${modelName} failed on recipe-costing-ai: ${err.message || err}`);
          const isQuota = (err.message || "").includes("429") || (err.message || "").includes("quota");
          modelCooldowns.set(modelName, Date.now() + (isQuota ? 30 * 60 * 1000 : COOLDOWN_DURATION));
        }
      }

      if (!response) {
        throw new Error(`Fallback failure: ${lastError?.message || lastError}`);
      }

      let cleanJson = (response.text || "").trim();
      if (cleanJson.includes("```")) {
        const match = cleanJson.match(/```(?:json)?([\s\S]*?)```/);
        if (match && match[1]) cleanJson = match[1].trim();
      }

      const parsedResult = JSON.parse(cleanJson);
      res.json(parsedResult);

    } catch (error: any) {
      console.error("Error in /api/recipe-costing-ai:", error);
      res.status(500).json({
        error: error.message || "Error al calcular el escandallo de la receta con la Inteligencia Artificial."
      });
    }
  });

  // API Route to send invoice and statement email to client
  app.post("/api/send-invoice-email", async (req, res) => {
    try {
      const {
        customerEmail,
        customerName,
        customerPhone,
        customerCedula,
        customerAddress,
        invoiceId,
        productName,
        quantity,
        salePrice,
        paymentMethod,
        totalAmount,
        paidAmount,
        remainingAmount,
        paymentPeriodicity,
        status,
        date,
        abonos = []
      } = req.body;

      if (!customerEmail || !customerEmail.includes("@")) {
        return res.status(400).json({ error: "Por favor proporciona un correo electrónico válido." });
      }

      // Configure transporter
      let transporter;
      let isEthereal = false;

      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (smtpHost && smtpPort && smtpUser && smtpPass) {
        transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort, 10),
          secure: smtpPort === "465",
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });
      } else {
        // Fallback to Ethereal Email sandbox for testing
        isEthereal = true;
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
      }

      const formattedTotal = totalAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
      const formattedPaid = paidAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
      const formattedRemaining = remainingAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
      const formattedPrice = salePrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

      const abonosHtml = abonos && abonos.length > 0
        ? `
          <div style="margin-top: 20px; background-color: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <h4 style="margin: 0 0 10px 0; color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Historial de Abonos / Pagos</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
              <thead>
                <tr style="border-bottom: 1px solid #e2e8f0; color: #64748b;">
                  <th style="padding: 6px 0;">Fecha</th>
                  <th style="padding: 6px 0;">Método</th>
                  <th style="padding: 6px 0; text-align: right;">Monto</th>
                </tr>
              </thead>
              <tbody>
                ${abonos.map((ab: any) => `
                  <tr style="border-bottom: 1px solid #f1f5f9; color: #334155;">
                    <td style="padding: 8px 0;">${ab.date}</td>
                    <td style="padding: 8px 0;">${ab.paymentMethod}</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #10b981;">+$${parseFloat(ab.amount).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `
        : '';

      const isPending = status === "pendiente" || remainingAmount > 0;
      const statementHtml = isPending
        ? `
          <div style="margin-top: 25px; padding: 20px; background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px;">
            <h3 style="margin: 0 0 10px 0; color: #b45309; font-size: 16px;">📅 Estado de Cuenta & Plan de Pago</h3>
            <p style="margin: 0 0 12px 0; font-size: 13px; color: #78350f; line-height: 1.5;">
              Su compra se encuentra bajo un plan de pago con periodicidad de cobro <strong>${paymentPeriodicity === 'semanal' ? 'Semanal' : paymentPeriodicity === 'quincenal' ? 'Quincenal' : paymentPeriodicity === 'mensual' ? 'Mensual' : 'Personalizado'}</strong>.
            </p>
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #78350f; margin-bottom: 6px;">
              <span>Monto Total Financiado:</span>
              <span style="font-weight: bold;">${formattedTotal}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #15803d; margin-bottom: 6px;">
              <span>Monto Pagado a la Fecha:</span>
              <span style="font-weight: bold;">${formattedPaid}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 14px; color: #b91c1c; font-weight: bold; border-top: 1px dashed #fcd34d; padding-top: 8px; margin-top: 8px;">
              <span>Saldo Pendiente por Pagar:</span>
              <span>${formattedRemaining}</span>
            </div>
          </div>
        `
        : `
          <div style="margin-top: 25px; padding: 15px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; text-align: center; color: #065f46; font-weight: bold; font-size: 14px;">
            🎉 ¡Esta factura se encuentra totalmente SALDADA / PAGADA! ¡Muchas gracias por su compra!
          </div>
        `;

      const formattedInvoiceId = (invoiceId && invoiceId.length <= 8 && !isNaN(Number(invoiceId))) 
        ? String(Number(invoiceId)).padStart(6, "0") 
        : (invoiceId || "000001");

      const mailOptions = {
        from: smtpUser ? `"SinGlutenpzo (Oriven) 🌾🍰" <${smtpUser}>` : '"SinGlutenpzo (Oriven)" <facturacion@singlutenpzo.com>',
        to: customerEmail,
        subject: `Recibo de Venta / Factura #${formattedInvoiceId} - SinGlutenpzo (Oriven) 🌾🍰`,
        html: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155; line-height: 1.6;">
            <div style="text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 25px;">
              <h1 style="margin: 0; color: #047857; font-size: 28px; font-weight: 900; letter-spacing: -0.025em;">SINGLUTENPZO</h1>
              <p style="margin: 5px 0 0 0; color: #059669; font-size: 13px; font-weight: bold; uppercase; tracking: 0.1em;">Oriven Distribuidora de Alimentos J-40633400-6</p>
              <p style="margin: 2px 0 0 0; color: #64748b; font-size: 11px;">Productos 100% Sin Gluten & Postres Saludables</p>
            </div>

            <p style="font-size: 15px; margin-bottom: 20px;">
              Estimado(a) <strong>${customerName}</strong>,
            </p>
            <p style="font-size: 14px; margin-bottom: 20px; color: #475569;">
              Le agradecemos enormemente su preferencia. A continuación le detallamos su recibo de venta y estado de cuenta correspondiente a su compra realizada el día <strong>${date}</strong>.
            </p>

            <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <div style="background-color: #f8fafc; padding: 15px; border-bottom: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: #64748b;">
                  <span>RECIBO / FACTURA: #${formattedInvoiceId}</span>
                  <span>Nº CONTROL: #${formattedInvoiceId}</span>
                  <span>FECHA: ${date}</span>
                </div>
              </div>
              <div style="padding: 20px;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
                  <thead>
                    <tr style="border-bottom: 2px solid #f1f5f9; color: #64748b; font-size: 12px; text-transform: uppercase;">
                      <th style="padding-bottom: 10px;">Producto</th>
                      <th style="padding-bottom: 10px; text-align: center;">Cant.</th>
                      <th style="padding-bottom: 10px; text-align: right;">Precio Unit.</th>
                      <th style="padding-bottom: 10px; text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom: 1px solid #f1f5f9; color: #334155;">
                      <td style="padding: 12px 0;"><strong>${productName}</strong></td>
                      <td style="padding: 12px 0; text-align: center;">${quantity}</td>
                      <td style="padding: 12px 0; text-align: right;">${formattedPrice}</td>
                      <td style="padding: 12px 0; text-align: right; font-weight: bold;">${formattedTotal}</td>
                    </tr>
                  </tbody>
                </table>

                <div style="margin-top: 15px; border-top: 2px solid #f1f5f9; padding-top: 15px;">
                  <table style="width: 100%; font-size: 14px; color: #475569;">
                    <tr>
                      <td style="text-align: right; padding-right: 20px; font-weight: bold;">Subtotal:</td>
                      <td style="text-align: right; width: 100px; font-weight: bold; color: #1e293b;">${formattedTotal}</td>
                    </tr>
                    <tr>
                      <td style="text-align: right; padding-right: 20px; font-weight: bold;">Método de Pago:</td>
                      <td style="text-align: right; font-weight: bold; color: #7c3aed;">${paymentMethod}</td>
                    </tr>
                    <tr style="font-size: 16px; color: #1e293b;">
                      <td style="text-align: right; padding-right: 20px; font-weight: 900; padding-top: 10px;">Total Cancelado:</td>
                      <td style="text-align: right; font-weight: 900; padding-top: 10px; color: #7c3aed;">${formattedTotal}</td>
                    </tr>
                  </table>
                </div>
              </div>
            </div>

            ${statementHtml}
            ${abonosHtml}

            <div style="margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0 0 5px 0;"><strong>Cliente:</strong> ${customerName}</p>
              <p style="margin: 0 0 5px 0;"><strong>Identificación:</strong> ${customerCedula}</p>
              <p style="margin: 0 0 5px 0;"><strong>Teléfono:</strong> ${customerPhone}</p>
              <p style="margin: 0 0 5px 0;"><strong>Dirección:</strong> ${customerAddress}</p>
            </div>

            <div style="margin-top: 40px; border-top: 2px solid #f1f5f9; padding-top: 20px; text-align: center; font-size: 11px; color: #94a3b8;">
              <p style="margin: 0 0 5px 0;">SinGlutenpzo (Oriven Distribuidora de Alimentos J-40633400-6) - Productos 100% Sin Gluten y Postres Saludables.</p>
              <p style="margin: 0 0 5px 0;">Si tiene alguna pregunta sobre esta factura, por favor contáctenos a nuestro WhatsApp.</p>
              <p style="margin: 0;">© 2026 SinGlutenpzo. Todos los derechos reservados.</p>
            </div>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", info.messageId);

      let etherealUrl = null;
      if (isEthereal) {
        etherealUrl = nodemailer.getTestMessageUrl(info);
        console.log("Ethereal test email URL:", etherealUrl);
      }

      res.json({
        success: true,
        messageId: info.messageId,
        isEthereal: isEthereal,
        etherealUrl: etherealUrl
      });
    } catch (err: any) {
      console.error("Error sending invoice email:", err);
      res.status(500).json({ error: err.message || "Error al enviar correo electrónico de factura." });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Serve static assets or use Vite dev server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SinGlutenpzo server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
