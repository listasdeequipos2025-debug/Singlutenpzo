import React, { useState, useEffect } from "react";
import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, getDoc,
  db, handleFirestoreError, OperationType, syncLocalDataToFirestore
} from "./lib/firebase";
import {
  Product, Sale, Purchase, Expense, ReturnItem, StoreSettings,
  ProductCategory, PurchaseStatus, PurchaseType, Provider,
  RawMaterial, Recipe
} from "./types";

// Import modular components
import Navbar from "./components/Navbar";
import AdminLogin from "./components/AdminLogin";
import Catalog from "./components/Catalog";
import Dashboard from "./components/Dashboard";
import InventoryManager from "./components/InventoryManager";
import SalesManager from "./components/SalesManager";
import PurchasesManager from "./components/PurchasesManager";
import ExpensesManager from "./components/ExpensesManager";
import ReturnsManager from "./components/ReturnsManager";
import SettingsManager from "./components/SettingsManager";
import ClientesManager from "./components/ClientesManager";
import RawMaterialsAndRecipes from "./components/RawMaterialsAndRecipes";
import bgImg from "./assets/images/singlutenpzo_bg_1785767621918.jpg";

// Helper function to remove undefined values from Firestore payloads
function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined) as unknown as T;
  }
  if (typeof obj === "object") {
    const clean: any = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        clean[key] = cleanUndefined(val);
      }
    }
    return clean as T;
  }
  return obj;
}

function normalizeString(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export default function App() {
  // Navigation & Authentication states
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("catalogo");
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Firestore Real-time Collections States
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [pin, setPin] = useState("1234"); // Defaults to 1234
  const [whatsapp, setWhatsapp] = useState("584120000000"); // Default WhatsApp
  const [recoveryEmail, setRecoveryEmail] = useState("admin@singlutenpzo.com");
  const [securityQuestion, setSecurityQuestion] = useState("¿Cuál es tu producto sin gluten o postre favorito?");
  const [securityAnswer, setSecurityAnswer] = useState("Brownies");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  // Real-time synchronization listeners
  useEffect(() => {
    // Check and auto-migrate any orphaned local storage data to Firebase Firestore
    syncLocalDataToFirestore().then((res) => {
      if (res.migratedCount > 0) {
        console.log(`[Firebase Auto-Recovery] Se migraron automáticamente ${res.migratedCount} registros locales a Cloud Firestore.`);
      }
    }).catch((err) => {
      console.warn("Auto-sync error:", err);
    });

    // 1. Listen to settings / PIN, WhatsApp, and Recovery options
    const pinDocRef = doc(db, "settings", "admin");
    const unsubscribePin = onSnapshot(pinDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPin(data.pin || "1234");
        setWhatsapp(data.whatsapp || "584120000000");
        setRecoveryEmail(data.recoveryEmail || "admin@singlutenpzo.com");
        setSecurityQuestion(data.securityQuestion || "¿Cuál es tu producto sin gluten o postre favorito?");
        setSecurityAnswer(data.securityAnswer || "Brownies");
      } else {
        // Create initial settings document if missing
        setDoc(pinDocRef, {
          pin: "1234",
          whatsapp: "584120000000",
          recoveryEmail: "admin@singlutenpzo.com",
          securityQuestion: "¿Cuál es tu producto sin gluten o postre favorito?",
          securityAnswer: "Brownies"
        }).catch((error) => {
          handleFirestoreError(error, OperationType.WRITE, "settings/admin");
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "settings/admin");
    });

    // 2. Listen to Inventory (Products)
    const unsubscribeProducts = onSnapshot(collection(db, "inventory"), (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          name: data.name || "",
          category: data.category || ProductCategory.Equipos,
          costPrice: data.costPrice,
          salePrice: data.salePrice || 0,
          wholesalePrice: data.wholesalePrice,
          creditPrice: data.creditPrice,
          referenceProfit: data.referenceProfit,
          stock: data.stock !== undefined ? data.stock : 0,
          image: data.image || "",
          createdAt: data.createdAt || ""
        });
      });
      // Sort by creation date or name
      setProducts(items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "inventory");
    });

    // 3. Listen to Sales
    const unsubscribeSales = onSnapshot(collection(db, "sales"), (snapshot) => {
      const items: Sale[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const totalAmount = (data.salePrice || 0) * (data.quantity || 1);
        items.push({
          id: docSnap.id,
          invoiceNumber: data.invoiceNumber || "",
          controlNumber: data.controlNumber || "",
          productName: data.productName || "",
          productId: data.productId || "",
          category: data.category || ProductCategory.Equipos,
          quantity: data.quantity || 1,
          salePrice: data.salePrice || 0,
          costPrice: data.costPrice || 0,
          profit: data.profit || 0,
          reference: data.reference,
          customerName: data.customerName || "Cliente General",
          customerPhone: data.customerPhone || "N/A",
          customerCedula: data.customerCedula || "",
          customerAddress: data.customerAddress || "",
          customerEmail: data.customerEmail || "",
          date: data.date || "",
          month: data.month || "",
          paymentMethod: data.paymentMethod || "Efectivo",
          createdAt: data.createdAt || "",
          paidAmount: data.paidAmount !== undefined ? data.paidAmount : totalAmount,
          remainingAmount: data.remainingAmount !== undefined ? data.remainingAmount : 0,
          status: data.status || "pagado",
          installmentsCount: data.installmentsCount !== undefined ? data.installmentsCount : undefined,
          paymentPeriodicity: data.paymentPeriodicity || undefined,
          specificPaymentDate: data.specificPaymentDate || undefined,
          initialPaymentAmount: data.initialPaymentAmount !== undefined ? data.initialPaymentAmount : undefined,
          initialPaymentPercentage: data.initialPaymentPercentage !== undefined ? data.initialPaymentPercentage : undefined,
          abonos: data.abonos || []
        });
      });
      // Sort oldest first to assign 000001 consecutive numbers to records without custom numbers
      const sortedOldest = [...items].sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
      const normalizedItems = sortedOldest.map((item, idx) => {
        const defaultSeq = String(idx + 1).padStart(6, "0");
        const invNum = item.invoiceNumber && item.invoiceNumber.trim() !== ""
          ? (isNaN(parseInt(item.invoiceNumber, 10)) ? defaultSeq : String(parseInt(item.invoiceNumber, 10)).padStart(6, "0"))
          : defaultSeq;
        const ctrlNum = item.controlNumber && item.controlNumber.trim() !== ""
          ? (isNaN(parseInt(item.controlNumber, 10)) ? invNum : String(parseInt(item.controlNumber, 10)).padStart(6, "0"))
          : invNum;
        return {
          ...item,
          invoiceNumber: invNum,
          controlNumber: ctrlNum
        };
      });

      // Sort newest first for display
      setSales(normalizedItems.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "sales");
    });

    // 4. Listen to Purchases
    const unsubscribePurchases = onSnapshot(collection(db, "purchases"), (snapshot) => {
      const items: Purchase[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          invoiceNumber: data.invoiceNumber || "",
          provider: data.provider || "",
          providerRif: data.providerRif || undefined,
          providerAddress: data.providerAddress || undefined,
          date: data.date || "",
          month: data.month || "",
          items: data.items || [],
          totalAmount: data.totalAmount || 0,
          type: data.type || PurchaseType.Contado,
          status: data.status || PurchaseStatus.Pagado,
          paymentDate: data.paymentDate || "",
          createdAt: data.createdAt || "",
          invoiceImage: data.invoiceImage || undefined,
          currency: data.currency || undefined,
          bcvRate: data.bcvRate || undefined,
          originalAmountVES: data.originalAmountVES || undefined
        });
      });
      setPurchases(items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "purchases");
    });

    // 5. Listen to Expenses
    const unsubscribeExpenses = onSnapshot(collection(db, "expenses"), (snapshot) => {
      const items: Expense[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          description: data.description || "",
          amount: data.amount || 0,
          date: data.date || "",
          month: data.month || "",
          category: data.category || "",
          createdAt: data.createdAt || ""
        });
      });
      setExpenses(items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "expenses");
    });

    // 6. Listen to Returns
    const unsubscribeReturns = onSnapshot(collection(db, "returns"), (snapshot) => {
      const items: ReturnItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          productId: data.productId || "",
          productName: data.productName || "",
          category: data.category || ProductCategory.Equipos,
          quantity: data.quantity || 1,
          date: data.date || "",
          month: data.month || "",
          refundAmount: data.refundAmount || 0,
          discountCostFromProfit: data.discountCostFromProfit || false,
          costPrice: data.costPrice || 0,
          createdAt: data.createdAt || ""
        });
      });
      setReturns(items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "returns");
    });

    // 7. Listen to Providers
    const unsubscribeProviders = onSnapshot(collection(db, "providers"), (snapshot) => {
      const items: Provider[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          name: data.name || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          rif: data.rif || "",
          notes: data.notes || "",
          createdAt: data.createdAt || ""
        });
      });
      setProviders(items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "providers");
    });

    // 8. Listen to Raw Materials (Materia Prima)
    const unsubscribeRawMaterials = onSnapshot(collection(db, "raw_materials"), (snapshot) => {
      const items: RawMaterial[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          name: data.name || "",
          unit: data.unit || "kg",
          stock: data.stock !== undefined ? data.stock : 0,
          minStock: data.minStock !== undefined ? data.minStock : 2,
          costPerUnit: data.costPerUnit !== undefined ? data.costPerUnit : 0,
          totalCost: data.totalCost !== undefined ? data.totalCost : 0,
          supplier: data.supplier || "",
          notes: data.notes || "",
          createdAt: data.createdAt || "",
          updatedAt: data.updatedAt || ""
        });
      });
      setRawMaterials(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "raw_materials");
    });

    // 9. Listen to Recipes (Recetas)
    const unsubscribeRecipes = onSnapshot(collection(db, "recipes"), (snapshot) => {
      const items: Recipe[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          name: data.name || "",
          yieldQuantity: data.yieldQuantity || 1,
          yieldUnit: data.yieldUnit || "porciones",
          preparationTimeMinutes: data.preparationTimeMinutes || 30,
          category: data.category || "Panadería",
          description: data.description || "",
          ingredients: data.ingredients || [],
          totalIngredientsCost: data.totalIngredientsCost || 0,
          packagingCost: data.packagingCost || 0,
          laborCost: data.laborCost || 0,
          overheadPercentage: data.overheadPercentage || 0,
          overheadCost: data.overheadCost || 0,
          totalRecipeCost: data.totalRecipeCost || 0,
          costPerUnit: data.costPerUnit || 0,
          desiredMarginPercentage: data.desiredMarginPercentage || 50,
          suggestedSalePricePerUnit: data.suggestedSalePricePerUnit || 0,
          suggestedBatchSalePrice: data.suggestedBatchSalePrice || 0,
          aiAnalysis: data.aiAnalysis || undefined,
          createdAt: data.createdAt || "",
          updatedAt: data.updatedAt || ""
        });
      });
      setRecipes(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "recipes");
    });

    // Clean up real-time listeners on unmount
    return () => {
      unsubscribePin();
      unsubscribeProducts();
      unsubscribeSales();
      unsubscribePurchases();
      unsubscribeExpenses();
      unsubscribeReturns();
      unsubscribeProviders();
      unsubscribeRawMaterials();
      unsubscribeRecipes();
    };
  }, []);

  // ----------------------------------------------------
  // INVENTORY OPERATIONS
  // ----------------------------------------------------
  const handleAddProduct = async (prodData: Omit<Product, "id" | "createdAt">) => {
    try {
      const normalizedNewName = normalizeString(prodData.name);
      const existing = products.find((p) => normalizeString(p.name) === normalizedNewName);

      if (existing) {
        // Update existing instead of creating a duplicate
        // Only update other fields (category, prices, reference, image) and keep existing stock untouched
        const docRef = doc(db, "inventory", existing.id);
        const updates: Partial<Product> = {
          category: prodData.category,
          salePrice: prodData.salePrice,
        };
        if (prodData.costPrice !== undefined) updates.costPrice = prodData.costPrice;
        if (prodData.wholesalePrice !== undefined) updates.wholesalePrice = prodData.wholesalePrice;
        if (prodData.creditPrice !== undefined) updates.creditPrice = prodData.creditPrice;
        if (prodData.referenceProfit !== undefined) updates.referenceProfit = prodData.referenceProfit;
        if (prodData.image !== undefined) updates.image = prodData.image;

        await updateDoc(docRef, cleanUndefined(updates));
      } else {
        const docRef = collection(db, "inventory");
        await addDoc(docRef, cleanUndefined({
          ...prodData,
          createdAt: new Date().toISOString()
        }));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "inventory");
    }
  };

  const handleAddProductsBulk = async (prodList: Omit<Product, "id" | "createdAt">[], shouldModifyStock?: boolean) => {
    try {
      for (const item of prodList) {
        const normalizedNewName = normalizeString(item.name);
        const existing = products.find((p) => normalizeString(p.name) === normalizedNewName);

        if (existing) {
          // Detect changes and update the existing product
          const docRef = doc(db, "inventory", existing.id);
          const updates: Partial<Product> = {
            category: item.category,
            salePrice: item.salePrice,
            isBulkUploaded: true // Mark so that bulk uploaded products can be deleted together
          };
          if (item.costPrice !== undefined) updates.costPrice = item.costPrice;
          if (item.wholesalePrice !== undefined) updates.wholesalePrice = item.wholesalePrice;
          if (item.creditPrice !== undefined) updates.creditPrice = item.creditPrice;
          if (item.referenceProfit !== undefined) updates.referenceProfit = item.referenceProfit;
          if (item.image !== undefined) updates.image = item.image;

          // If shouldModifyStock is true and new stock is valid (> 0), sum it to the old stock
          if (shouldModifyStock && item.stock !== undefined && item.stock > 0) {
            updates.stock = existing.stock + item.stock;
          }

          await updateDoc(docRef, cleanUndefined(updates));
        } else {
          // If no match, add as a new product
          const docRef = collection(db, "inventory");
          await addDoc(docRef, cleanUndefined({
            ...item,
            isBulkUploaded: true,
            createdAt: new Date().toISOString()
          }));
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "inventory");
    }
  };

  const handleEditProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const docRef = doc(db, "inventory", id);
      await updateDoc(docRef, cleanUndefined(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inventory/${id}`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const docRef = doc(db, "inventory", id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inventory/${id}`);
    }
  };

  const handleDeleteProductsBulk = async (ids: string[]) => {
    try {
      for (const id of ids) {
        const docRef = doc(db, "inventory", id);
        await deleteDoc(docRef);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "inventory");
    }
  };

  // ----------------------------------------------------
  // SALES OPERATIONS
  // ----------------------------------------------------
  const handleRegisterSale = async (saleData: Omit<Sale, "id" | "createdAt">): Promise<string> => {
    try {
      // Calculate next consecutive invoice number starting from 1 (000001)
      let nextNumber = 1;
      if (sales && sales.length > 0) {
        const numbers = sales
          .map(s => s.invoiceNumber ? parseInt(s.invoiceNumber, 10) : 0)
          .filter(n => !isNaN(n) && n > 0);
        const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
        nextNumber = maxNum + 1;
      }
      const formattedInvoiceNumber = String(nextNumber).padStart(6, "0");

      // 1. Record the sale
      const docRef = collection(db, "sales");
      const addedDoc = await addDoc(docRef, cleanUndefined({
        ...saleData,
        invoiceNumber: formattedInvoiceNumber,
        controlNumber: formattedInvoiceNumber,
        createdAt: new Date().toISOString()
      }));

      // 2. Decrement product stock in inventory
      if (saleData.items && saleData.items.length > 0) {
        for (const item of saleData.items) {
          if (item.productId) {
            const productRef = doc(db, "inventory", item.productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
              const currentStock = productSnap.data().stock || 0;
              await updateDoc(productRef, {
                stock: currentStock - item.quantity
              });
            }
          }
        }
      } else if (saleData.productId) {
        const productRef = doc(db, "inventory", saleData.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock || 0;
          await updateDoc(productRef, {
            stock: currentStock - saleData.quantity
          });
        }
      }

      // 3. Automatically send invoice email if customerEmail is provided
      if (saleData.customerEmail) {
        try {
          const response = await fetch("/api/send-invoice-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerEmail: saleData.customerEmail,
              customerName: saleData.customerName,
              customerPhone: saleData.customerPhone,
              customerCedula: saleData.customerCedula,
              customerAddress: saleData.customerAddress,
              invoiceId: formattedInvoiceNumber,
              productName: saleData.productName,
              quantity: saleData.quantity,
              salePrice: saleData.salePrice,
              items: saleData.items,
              paymentMethod: saleData.paymentMethod,
              totalAmount: saleData.salePrice * saleData.quantity,
              paidAmount: saleData.paidAmount,
              remainingAmount: saleData.remainingAmount,
              paymentPeriodicity: saleData.paymentPeriodicity,
              status: saleData.status,
              date: saleData.date,
              abonos: []
            })
          });
          const result = await response.json();
          if (result.success && result.isEthereal && result.etherealUrl) {
            alert(`[Simulación Factura] Correo enviado. Puedes ver el diseño real de la factura aquí:\n${result.etherealUrl}`);
          }
        } catch (emailErr) {
          console.error("Network error sending email:", emailErr);
        }
      }

      return addedDoc.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "sales");
      throw error;
    }
  };

  const handleUpdateSaleDebt = async (saleId: string, paidIncrement: number, paymentMethod: string = "Efectivo", paymentDate?: string) => {
    try {
      const docRef = doc(db, "sales", saleId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const totalAmount = (data.salePrice || 0) * (data.quantity || 1);
        const currentPaid = data.paidAmount !== undefined ? data.paidAmount : totalAmount;
        const newPaid = Math.min(totalAmount, currentPaid + paidIncrement);
        const newRemaining = Math.max(0, totalAmount - newPaid);
        const newStatus = newRemaining === 0 ? "pagado" : "pendiente";

        const currentAbonos = data.abonos || [];
        const abonoDate = paymentDate || new Date().toISOString().split("T")[0];
        const updatedAbonos = [
          ...currentAbonos,
          {
            date: abonoDate,
            amount: paidIncrement,
            paymentMethod: paymentMethod
          }
        ];

        await updateDoc(docRef, {
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          status: newStatus,
          abonos: updatedAbonos
        });

        // Automatically send updated invoice / statement email if customerEmail is provided
        if (data.customerEmail) {
          try {
            const response = await fetch("/api/send-invoice-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customerEmail: data.customerEmail,
                customerName: data.customerName || "Cliente General",
                customerPhone: data.customerPhone || "N/A",
                customerCedula: data.customerCedula || "N/A",
                customerAddress: data.customerAddress || "N/A",
                invoiceId: saleId,
                productName: data.productName || "",
                quantity: data.quantity || 1,
                salePrice: data.salePrice || 0,
                paymentMethod: paymentMethod,
                totalAmount: totalAmount,
                paidAmount: newPaid,
                remainingAmount: newRemaining,
                paymentPeriodicity: data.paymentPeriodicity || "semanal",
                status: newStatus,
                date: data.date || abonoDate,
                abonos: updatedAbonos
              })
            });
            const result = await response.json();
            if (result.success && result.isEthereal && result.etherealUrl) {
              alert(`[Plan de Pagos / Abono] Estado de cuenta actualizado y enviado al cliente. Puedes verlo aquí:\n${result.etherealUrl}`);
            }
          } catch (emailErr) {
            console.error("Failed to send updated invoice email:", emailErr);
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sales/${saleId}`);
    }
  };

  const handleDeleteSale = async (id: string) => {
    try {
      const docRef = doc(db, "sales", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const saleData = docSnap.data();
        if (saleData.items && saleData.items.length > 0) {
          for (const item of saleData.items) {
            if (item.productId) {
              const productRef = doc(db, "inventory", item.productId);
              const productSnap = await getDoc(productRef);
              if (productSnap.exists()) {
                const currentStock = productSnap.data().stock || 0;
                await updateDoc(productRef, {
                  stock: currentStock + item.quantity
                });
              }
            }
          }
        } else if (saleData.productId) {
          const productId = saleData.productId;
          const quantity = saleData.quantity || 1;
          const productRef = doc(db, "inventory", productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const currentStock = productSnap.data().stock || 0;
            await updateDoc(productRef, {
              stock: currentStock + quantity
            });
          }
        }
      }
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sales/${id}`);
    }
  };

  const handleEditSale = async (id: string, updates: Partial<Sale>) => {
    try {
      const docRef = doc(db, "sales", id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return;
      const oldSale = docSnap.data() as Sale;

      const prodIdChanged = updates.productId && updates.productId !== oldSale.productId;
      const qtyChanged = updates.quantity !== undefined && updates.quantity !== oldSale.quantity;

      if (prodIdChanged || qtyChanged) {
        // Return old stock
        if (oldSale.productId) {
          const oldProductRef = doc(db, "inventory", oldSale.productId);
          const oldProductSnap = await getDoc(oldProductRef);
          if (oldProductSnap.exists()) {
            const oldStock = oldProductSnap.data().stock || 0;
            await updateDoc(oldProductRef, {
              stock: oldStock + (oldSale.quantity || 1)
            });
          }
        }

        // Deduct new stock
        const targetProdId = updates.productId || oldSale.productId;
        const targetQty = updates.quantity !== undefined ? updates.quantity : (oldSale.quantity || 1);
        if (targetProdId) {
          const newProductRef = doc(db, "inventory", targetProdId);
          const newProductSnap = await getDoc(newProductRef);
          if (newProductSnap.exists()) {
            const newStock = newProductSnap.data().stock || 0;
            await updateDoc(newProductRef, {
              stock: newStock - targetQty
            });
          }
        }
      }

      await updateDoc(docRef, cleanUndefined(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sales/${id}`);
    }
  };

  const handleUpdateClient = async (
    oldCedula: string,
    oldName: string,
    newDetails: { name: string; phone: string; cedula: string; address: string; email: string }
  ) => {
    try {
      const salesToUpdate = sales.filter((sale) => {
        const saleCedula = sale.customerCedula || "N/A";
        const saleName = sale.customerName || "Cliente General";
        if (oldCedula !== "N/A" && sale.customerCedula && sale.customerCedula !== "N/A") {
          return saleCedula.toLowerCase() === oldCedula.toLowerCase();
        }
        return saleName.toLowerCase() === oldName.toLowerCase();
      });

      for (const sale of salesToUpdate) {
        const docRef = doc(db, "sales", sale.id);
        await updateDoc(docRef, {
          customerName: newDetails.name,
          customerPhone: newDetails.phone,
          customerCedula: newDetails.cedula,
          customerAddress: newDetails.address,
          customerEmail: newDetails.email
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "sales");
    }
  };

  const handleDeleteClient = async (oldCedula: string, oldName: string) => {
    try {
      const salesToAnonymize = sales.filter((sale) => {
        const saleCedula = sale.customerCedula || "N/A";
        const saleName = sale.customerName || "Cliente General";
        if (oldCedula !== "N/A" && sale.customerCedula && sale.customerCedula !== "N/A") {
          return saleCedula.toLowerCase() === oldCedula.toLowerCase();
        }
        return saleName.toLowerCase() === oldName.toLowerCase();
      });

      for (const sale of salesToAnonymize) {
        const docRef = doc(db, "sales", sale.id);
        await updateDoc(docRef, {
          customerName: "Cliente General",
          customerCedula: "N/A",
          customerPhone: "N/A",
          customerAddress: "N/A",
          customerEmail: ""
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "sales");
    }
  };

  // ----------------------------------------------------
  // PROVIDER OPERATIONS
  // ----------------------------------------------------
  const handleAddProvider = async (pData: Omit<Provider, "id" | "createdAt">) => {
    try {
      const docRef = collection(db, "providers");
      const todayStr = new Date().toISOString();
      await addDoc(docRef, cleanUndefined({
        ...pData,
        createdAt: todayStr
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "providers");
    }
  };

  const handleEditProvider = async (id: string, updates: Partial<Provider>) => {
    try {
      const docRef = doc(db, "providers", id);
      await updateDoc(docRef, cleanUndefined(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `providers/${id}`);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    try {
      const docRef = doc(db, "providers", id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `providers/${id}`);
    }
  };

  // ----------------------------------------------------
  // PURCHASES OPERATIONS
  // ----------------------------------------------------
  const handleAddPurchase = async (pData: Omit<Purchase, "id" | "createdAt">) => {
    try {
      const docRef = collection(db, "purchases");
      await addDoc(docRef, cleanUndefined({
        ...pData,
        createdAt: new Date().toISOString()
      }));

      // Auto-register provider in providers collection if not existing
      if (pData.provider && pData.provider.trim() !== "") {
        const pName = pData.provider.trim().toLowerCase();
        const pRifClean = (pData.providerRif || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const existsInProviders = providers.some(p => {
          const rClean = (p.rif || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
          if (pRifClean && pRifClean !== "NA" && rClean === pRifClean) return true;
          return p.name.trim().toLowerCase() === pName;
        });

        if (!existsInProviders) {
          await handleAddProvider({
            name: pData.provider.trim(),
            rif: pData.providerRif || "N/A",
            address: pData.providerAddress || "N/A",
            phone: "N/A",
            email: "",
            notes: "Registrado automáticamente desde factura de compra"
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "purchases");
      throw error;
    }
  };

  const handleAddPurchasesBulk = async (pList: Omit<Purchase, "id" | "createdAt">[]) => {
    try {
      const docRef = collection(db, "purchases");
      for (const item of pList) {
        await addDoc(docRef, cleanUndefined({
          ...item,
          createdAt: new Date().toISOString()
        }));

        if (item.provider && item.provider.trim() !== "") {
          const pName = item.provider.trim().toLowerCase();
          const pRifClean = (item.providerRif || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
          const existsInProviders = providers.some(p => {
            const rClean = (p.rif || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
            if (pRifClean && pRifClean !== "NA" && rClean === pRifClean) return true;
            return p.name.trim().toLowerCase() === pName;
          });

          if (!existsInProviders) {
            await handleAddProvider({
              name: item.provider.trim(),
              rif: item.providerRif || "N/A",
              address: item.providerAddress || "N/A",
              phone: "N/A",
              email: "",
              notes: "Registrado automáticamente desde importación de facturas"
            });
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "purchases");
      throw error;
    }
  };

  const handlePayPurchase = async (id: string) => {
    try {
      const docRef = doc(db, "purchases", id);
      const todayStr = new Date().toISOString().split("T")[0];
      await updateDoc(docRef, {
        status: PurchaseStatus.Pagado,
        paymentDate: todayStr
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `purchases/${id}`);
    }
  };

  const handleDeletePurchase = async (id: string) => {
    try {
      const docRef = doc(db, "purchases", id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `purchases/${id}`);
    }
  };

  const handleEditPurchase = async (id: string, updates: Partial<Purchase>) => {
    try {
      const docRef = doc(db, "purchases", id);
      await updateDoc(docRef, cleanUndefined(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `purchases/${id}`);
    }
  };

  // ----------------------------------------------------
  // EXPENSES OPERATIONS
  // ----------------------------------------------------
  const handleAddExpense = async (eData: Omit<Expense, "id" | "createdAt">) => {
    try {
      const docRef = collection(db, "expenses");
      await addDoc(docRef, cleanUndefined({
        ...eData,
        createdAt: new Date().toISOString()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "expenses");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const docRef = doc(db, "expenses", id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `expenses/${id}`);
    }
  };

  // ----------------------------------------------------
  // RETURNS OPERATIONS
  // ----------------------------------------------------
  const handleAddReturn = async (rData: Omit<ReturnItem, "id" | "createdAt">) => {
    try {
      // 1. Record return document
      const docRef = collection(db, "returns");
      await addDoc(docRef, cleanUndefined({
        ...rData,
        createdAt: new Date().toISOString()
      }));

      // 2. Return product back to stock in inventory
      const productRef = doc(db, "inventory", rData.productId);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const currentStock = productSnap.data().stock || 0;
        await updateDoc(productRef, {
          stock: currentStock + rData.quantity
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "returns");
    }
  };

  const handleDeleteReturn = async (id: string) => {
    try {
      const docRef = doc(db, "returns", id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `returns/${id}`);
    }
  };

  // ----------------------------------------------------
  // RAW MATERIALS (MATERIA PRIMA) OPERATIONS
  // ----------------------------------------------------
  const handleAddRawMaterial = async (material: Omit<RawMaterial, "id" | "createdAt">) => {
    try {
      const cleanData = cleanUndefined({
        ...material,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      await addDoc(collection(db, "raw_materials"), cleanData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "raw_materials");
    }
  };

  const handleEditRawMaterial = async (material: RawMaterial) => {
    try {
      const { id, ...data } = material;
      const cleanData = cleanUndefined({
        ...data,
        updatedAt: new Date().toISOString()
      });
      await updateDoc(doc(db, "raw_materials", id), cleanData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `raw_materials/${material.id}`);
    }
  };

  const handleDeleteRawMaterial = async (id: string) => {
    try {
      await deleteDoc(doc(db, "raw_materials", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `raw_materials/${id}`);
    }
  };

  // ----------------------------------------------------
  // RECIPES & ESCANDALLO OPERATIONS
  // ----------------------------------------------------
  const handleAddRecipe = async (recipe: Omit<Recipe, "id" | "createdAt">) => {
    try {
      const cleanData = cleanUndefined({
        ...recipe,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      await addDoc(collection(db, "recipes"), cleanData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "recipes");
    }
  };

  const handleEditRecipe = async (recipe: Recipe) => {
    try {
      const { id, ...data } = recipe;
      const cleanData = cleanUndefined({
        ...data,
        updatedAt: new Date().toISOString()
      });
      await updateDoc(doc(db, "recipes", id), cleanData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `recipes/${recipe.id}`);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    try {
      await deleteDoc(doc(db, "recipes", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `recipes/${id}`);
    }
  };

  // ----------------------------------------------------
  // SETTINGS & PIN MANAGEMENT
  // ----------------------------------------------------
  const handleUpdatePin = async (newPin: string) => {
    try {
      const docRef = doc(db, "settings", "admin");
      const writePromise = setDoc(docRef, { pin: newPin }, { merge: true });
      await Promise.race([
        writePromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout: La conexión con la base de datos de Firebase está tardando demasiado. Por favor, verifica tu conexión o vuelve a intentarlo.")), 8000)
        )
      ]);
      setPin(newPin);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "settings/admin");
    }
  };

  const handleUpdateWhatsappNumber = async (newWhatsapp: string) => {
    try {
      const docRef = doc(db, "settings", "admin");
      const writePromise = setDoc(docRef, { whatsapp: newWhatsapp }, { merge: true });
      await Promise.race([
        writePromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout: La conexión con la base de datos de Firebase está tardando demasiado. Por favor, verifica tu conexión o vuelve a intentarlo.")), 8000)
        )
      ]);
      setWhatsapp(newWhatsapp);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "settings/admin");
    }
  };

  const handleUpdateRecoverySettings = async (email: string, question: string, answer: string) => {
    try {
      const docRef = doc(db, "settings", "admin");
      const writePromise = setDoc(docRef, {
        recoveryEmail: email,
        securityQuestion: question,
        securityAnswer: answer
      }, { merge: true });
      await Promise.race([
        writePromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout: La conexión con la base de datos de Firebase está tardando demasiado.")), 8000)
        )
      ]);
      setRecoveryEmail(email);
      setSecurityQuestion(question);
      setSecurityAnswer(answer);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "settings/admin");
    }
  };

  // ----------------------------------------------------
  // CLOUD BACKUP & LOCAL SYNC HANDLERS
  // ----------------------------------------------------
  const handleRestoreBackup = async (backupData: any) => {
    if (!backupData || typeof backupData !== "object") {
      throw new Error("El archivo de respaldo no es válido.");
    }
    // Restore collections into Firestore
    if (Array.isArray(backupData.products)) {
      for (const item of backupData.products) {
        if (item.id) {
          const id = item.id;
          const clean = cleanUndefined({ ...item });
          delete clean.id;
          await setDoc(doc(db, "inventory", id), clean, { merge: true });
        }
      }
    }
    if (Array.isArray(backupData.sales)) {
      for (const item of backupData.sales) {
        if (item.id) {
          const id紧 = item.id;
          const clean = cleanUndefined({ ...item });
          delete clean.id;
          await setDoc(doc(db, "sales", id紧), clean, { merge: true });
        }
      }
    }
    if (Array.isArray(backupData.purchases)) {
      for (const item of backupData.purchases) {
        if (item.id) {
          const id = item.id;
          const clean = cleanUndefined({ ...item });
          delete clean.id;
          await setDoc(doc(db, "purchases", id), clean, { merge: true });
        }
      }
    }
    if (Array.isArray(backupData.providers)) {
      for (const item of backupData.providers) {
        if (item.id) {
          const id = item.id;
          const clean = cleanUndefined({ ...item });
          delete clean.id;
          await setDoc(doc(db, "providers", id), clean, { merge: true });
        }
      }
    }
    if (Array.isArray(backupData.expenses)) {
      for (const item of backupData.expenses) {
        if (item.id) {
          const id = item.id;
          const clean = cleanUndefined({ ...item });
          delete clean.id;
          await setDoc(doc(db, "expenses", id), clean, { merge: true });
        }
      }
    }
    if (Array.isArray(backupData.returns)) {
      for (const item of backupData.returns) {
        if (item.id) {
          const id = item.id;
          const clean = cleanUndefined({ ...item });
          delete clean.id;
          await setDoc(doc(db, "returns", id), clean, { merge: true });
        }
      }
    }
    if (Array.isArray(backupData.rawMaterials)) {
      for (const item of backupData.rawMaterials) {
        if (item.id) {
          const id = item.id;
          const clean = cleanUndefined({ ...item });
          delete clean.id;
          await setDoc(doc(db, "raw_materials", id), clean, { merge: true });
        }
      }
    }
    if (Array.isArray(backupData.recipes)) {
      for (const item of backupData.recipes) {
        if (item.id) {
          const id = item.id;
          const clean = cleanUndefined({ ...item });
          delete clean.id;
          await setDoc(doc(db, "recipes", id), clean, { merge: true });
        }
      }
    }
  };

  const handleManualSyncLocalToCloud = async () => {
    return await syncLocalDataToFirestore();
  };

  // Handle successful Admin Login
  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    setActiveTab("dashboard");
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setActiveTab("catalogo");
  };

  return (
    <div className="min-h-screen bg-amber-50/60 text-slate-800 font-sans antialiased relative selection:bg-amber-500 selection:text-white">
      {/* Background image overlay across entire app */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20 bg-cover bg-center bg-fixed z-0"
        style={{ backgroundImage: `url(${bgImg})` }}
      />
      <div className="fixed inset-0 pointer-events-none bg-amber-50/20 z-0" />

      {/* Navigation Header */}
      <Navbar
        isAdmin={isAdmin}
        onAdminClick={() => setIsLoginOpen(true)}
        onLogout={handleAdminLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Admin Verification Modal overlay */}
      <AdminLogin
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
        savedPin={pin}
        registeredWhatsapp={whatsapp}
        onResetPin={handleUpdatePin}
        recoveryEmail={recoveryEmail}
        securityQuestion={securityQuestion}
        securityAnswer={securityAnswer}
      />

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 relative z-10">
        {/* Render pages depending on current selection and role */}
        {!isAdmin || activeTab === "catalogo" ? (
          <Catalog products={products} whatsappNumber={whatsapp} />
        ) : (
          <div className="space-y-6">
            {activeTab === "dashboard" && (
              <Dashboard
                products={products}
                sales={sales}
                purchases={purchases}
                expenses={expenses}
                returns={returns}
              />
            )}
            {activeTab === "inventario" && (
              <InventoryManager
                products={products}
                onAddProduct={handleAddProduct}
                onAddProductsBulk={handleAddProductsBulk}
                onEditProduct={handleEditProduct}
                onDeleteProduct={handleDeleteProduct}
                onDeleteProductsBulk={handleDeleteProductsBulk}
              />
            )}
            {activeTab === "materiaprima" && (
              <RawMaterialsAndRecipes
                rawMaterials={rawMaterials}
                recipes={recipes}
                onAddRawMaterial={handleAddRawMaterial}
                onEditRawMaterial={handleEditRawMaterial}
                onDeleteRawMaterial={handleDeleteRawMaterial}
                onAddRecipe={handleAddRecipe}
                onEditRecipe={handleEditRecipe}
                onDeleteRecipe={handleDeleteRecipe}
                onPublishRecipeToProduct={handleAddProduct}
              />
            )}
            {activeTab === "ventas" && (
              <SalesManager
                products={products}
                sales={sales}
                onRegisterSale={handleRegisterSale}
                onUpdateSaleDebt={handleUpdateSaleDebt}
                onDeleteSale={handleDeleteSale}
                onEditSale={handleEditSale}
              />
            )}
            {activeTab === "compras" && (
              <PurchasesManager
                purchases={purchases}
                onAddPurchase={handleAddPurchase}
                onAddPurchasesBulk={handleAddPurchasesBulk}
                onPayPurchase={handlePayPurchase}
                onDeletePurchase={handleDeletePurchase}
                onEditPurchase={handleEditPurchase}
                providers={providers}
                onAddProvider={handleAddProvider}
                onEditProvider={handleEditProvider}
                onDeleteProvider={handleDeleteProvider}
              />
            )}
            {activeTab === "gastos" && (
              <ExpensesManager
                expenses={expenses}
                onAddExpense={handleAddExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            )}
            {activeTab === "devoluciones" && (
              <ReturnsManager
                products={products}
                returns={returns}
                onAddReturn={handleAddReturn}
                onDeleteReturn={handleDeleteReturn}
              />
            )}
            {activeTab === "clientes" && (
              <ClientesManager
                sales={sales}
                onUpdateSaleDebt={handleUpdateSaleDebt}
                onUpdateClient={handleUpdateClient}
                onDeleteClient={handleDeleteClient}
                onRegisterSale={handleRegisterSale}
              />
            )}
            {activeTab === "ajustes" && (
              <SettingsManager
                currentPin={pin}
                onUpdatePin={handleUpdatePin}
                currentWhatsapp={whatsapp}
                onUpdateWhatsapp={handleUpdateWhatsappNumber}
                recoveryEmail={recoveryEmail}
                securityQuestion={securityQuestion}
                securityAnswer={securityAnswer}
                onUpdateRecoverySettings={handleUpdateRecoverySettings}
                products={products}
                sales={sales}
                purchases={purchases}
                providers={providers}
                expenses={expenses}
                returns={returns}
                rawMaterials={rawMaterials}
                recipes={recipes}
                onRestoreBackup={handleRestoreBackup}
                onManualSyncLocalToCloud={handleManualSyncLocalToCloud}
              />
            )}
          </div>
        )}
      </main>

      {/* Professional Footer */}
      <footer className="border-t border-amber-200/60 bg-white/80 backdrop-blur-md py-6 mt-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest space-y-2 leading-relaxed">
          <p>© 2026 SinGlutenpzo - Oriven Distribuidora de Alimentos J-40633400-6. Productos Sin Gluten & Postres Saludables.</p>
          <p className="text-[10px] text-slate-400">Puerto Ordaz, Estado Bolívar. Todos los derechos reservados.</p>
          <p className="text-[10px] text-emerald-600 font-extrabold">Sincronizado en tiempo real a Firebase Cloud Firestore</p>
        </div>
      </footer>
    </div>
  );
}
