import React, { useState, useEffect } from "react";
import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, getDoc,
  db, handleFirestoreError, OperationType, syncLocalDataToFirestore
} from "./lib/firebase";
import {
  Product, Sale, Purchase, Expense, ReturnItem, StoreSettings,
  Provider, RawMaterial, Recipe
} from "./types";
import CatalogView from "./components/CatalogView";
import POSManager from "./components/POSManager";
import InventoryManager from "./components/InventoryManager";
import PurchasesManager from "./components/PurchasesManager";
import ExpensesManager from "./components/ExpensesManager";
import ReturnsManager from "./components/ReturnsManager";
import ReportsManager from "./components/ReportsManager";
import SettingsManager from "./components/SettingsManager";
import AdminLoginModal from "./components/AdminLoginModal";
import ProductionManager from "./components/ProductionManager";
import {
  ShoppingBag, Package, DollarSign, ArrowLeftRight, BarChart3, Settings,
  LogOut, Shield, Plus, Lock, ChefHat
} from "lucide-react";

// Helper function to remove undefined fields recursively to prevent Firestore crashes
function cleanUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  } else if (obj !== null && typeof obj === "object") {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        newObj[key] = cleanUndefined(val);
      }
    }
    return newObj;
  }
  return obj;
}

export default function App() {
  // Navigation & Authentication states
  const [activeTab, setActiveTab] = useState<"catalog" | "pos" | "inventory" | "purchases" | "expenses" | "returns" | "production" | "reports" | "settings">("catalog");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [adminPin, setAdminPin] = useState<string>("1234");
  const [storeWhatsapp, setStoreWhatsapp] = useState<string>("584148900000");
  const [recoveryEmail, setRecoveryEmail] = useState<string>("");
  const [securityQuestion, setSecurityQuestion] = useState<string>("nombre_mascota");
  const [securityAnswer, setSecurityAnswer] = useState<string>("");

  // Core Data Collections
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  // Exchange rate & Currency
  const [exchangeRate, setExchangeRate] = useState<number>(36.5);
  const [activeCurrency, setActiveCurrency] = useState<"USD" | "VES">("USD");

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
        if (data.pin) setAdminPin(data.pin);
        if (data.whatsapp) setStoreWhatsapp(data.whatsapp);
        if (data.recoveryEmail) setRecoveryEmail(data.recoveryEmail);
        if (data.securityQuestion) setSecurityQuestion(data.securityQuestion);
        if (data.securityAnswer) setSecurityAnswer(data.securityAnswer);
      } else {
        // Initialize default admin doc if missing
        setDoc(pinDocRef, {
          pin: "1234",
          whatsapp: "584148900000",
          recoveryEmail: "",
          securityQuestion: "nombre_mascota",
          securityAnswer: "firulais"
        }).catch((err) => handleFirestoreError(err, OperationType.CREATE, "settings/admin"));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "settings/admin");
    });

    // 2. Listen to exchange rate
    const rateDocRef = doc(db, "settings", "rate");
    const unsubscribeRate = onSnapshot(rateDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.rate) setExchangeRate(data.rate);
      } else {
        setDoc(rateDocRef, { rate: 36.5 }).catch((err) =>
          handleFirestoreError(err, OperationType.CREATE, "settings/rate")
        );
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "settings/rate");
    });

    // 3. Listen to Inventory / Products
    const productsCol = collection(db, "inventory");
    const unsubscribeProducts = onSnapshot(productsCol, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          name: data.name || "",
          category: data.category || "General",
          costUSD: data.costUSD || 0,
          priceUSD: data.priceUSD || 0,
          costVES: data.costVES || 0,
          priceVES: data.priceVES || 0,
          stock: data.stock || 0,
          minStock: data.minStock || 0,
          image: data.image || "",
          code: data.code || "",
          provider: data.provider || "",
          createdAt: data.createdAt || ""
        });
      });
      setProducts(items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "inventory");
    });

    // 4. Listen to Sales
    const salesCol = collection(db, "sales");
    const unsubscribeSales = onSnapshot(salesCol, (snapshot) => {
      const items: Sale[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          items: data.items || [],
          totalUSD: data.totalUSD || 0,
          totalVES: data.totalVES || 0,
          paymentMethod: data.paymentMethod || "efectivo_usd",
          reference: data.reference || "",
          customerName: data.customerName || "",
          customerPhone: data.customerPhone || "",
          customerDni: data.customerDni || "",
          date: data.date || new Date().toISOString(),
          type: data.type || "contado",
          status: data.status || "pagado",
          currency: data.currency || "USD",
          bcvRate: data.bcvRate || exchangeRate,
          paymentProof: data.paymentProof || undefined,
          deliveryOption: data.deliveryOption || undefined,
          deliveryAddress: data.deliveryAddress || undefined,
          customerNotes: data.customerNotes || undefined
        });
      });
      setSales(items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "sales");
    });

    // 5. Listen to Purchases
    const purchasesCol = collection(db, "purchases");
    const unsubscribePurchases = onSnapshot(purchasesCol, (snapshot) => {
      const items: Purchase[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          description: data.description || "",
          items: data.items || [],
          totalUSD: data.totalUSD || 0,
          paymentMethod: data.paymentMethod || "efectivo_usd",
          type: data.type || "contado",
          status: data.status || "pagado",
          provider: data.provider || "",
          providerRif: data.providerRif || "",
          providerAddress: data.providerAddress || "",
          paymentDate: data.paymentDate || "",
          invoiceImage: data.invoiceImage || "",
          createdAt: data.createdAt || "",
          currency: data.currency || "USD",
          bcvRate: data.bcvRate || undefined,
          originalAmountVES: data.originalAmountVES || undefined
        });
      });
      setPurchases(items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "purchases");
    });

    // 6. Listen to Expenses
    const expensesCol = collection(db, "expenses");
    const unsubscribeExpenses = onSnapshot(expensesCol, (snapshot) => {
      const items: Expense[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          description: data.description || "",
          amountUSD: data.amountUSD || 0,
          amountVES: data.amountVES || 0,
          category: data.category || "Otros",
          paymentMethod: data.paymentMethod || "efectivo_usd",
          reference: data.reference || "",
          createdAt: data.createdAt || ""
        });
      });
      setExpenses(items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "expenses");
    });

    // 7. Listen to Returns
    const returnsCol = collection(db, "returns");
    const unsubscribeReturns = onSnapshot(returnsCol, (snapshot) => {
      const items: ReturnItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          productId: data.productId || "",
          productName: data.productName || "",
          quantity: data.quantity || 0,
          reason: data.reason || "",
          action: data.action || "restock",
          refundAmountUSD: data.refundAmountUSD || 0,
          customerName: data.customerName || "",
          customerPhone: data.customerPhone || "",
          date: data.date || new Date().toISOString(),
          createdAt: data.createdAt || ""
        });
      });
      setReturns(items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "returns");
    });

    // 8. Listen to Providers
    const providersCol = collection(db, "providers");
    const unsubscribeProviders = onSnapshot(providersCol, (snapshot) => {
      const items: Provider[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          name: data.name || "",
          rif: data.rif || "",
          phone: data.phone || "",
          address: data.address || "",
          createdAt: data.createdAt || ""
        });
      });
      setProviders(items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "providers");
    });

    // 9. Listen to Raw Materials
    const rawMaterialsCol = collection(db, "raw_materials");
    const unsubscribeRaw = onSnapshot(rawMaterialsCol, (snapshot) => {
      const items: RawMaterial[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          name: data.name || "",
          unit: data.unit || "kg",
          costUSD: data.costUSD || 0,
          stock: data.stock || 0,
          minStock: data.minStock || 0,
          provider: data.provider || "",
          createdAt: data.createdAt || ""
        });
      });
      setRawMaterials(items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "raw_materials");
    });

    // 10. Listen to Recipes
    const recipesCol = collection(db, "recipes");
    const unsubscribeRecipes = onSnapshot(recipesCol, (snapshot) => {
      const items: Recipe[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          productId: data.productId || "",
          productName: data.productName || "",
          yieldUnits: data.yieldUnits || 1,
          ingredients: data.ingredients || [],
          totalCostUSD: data.totalCostUSD || 0,
          unitCostUSD: data.unitCostUSD || 0,
          updatedAt: data.updatedAt || ""
        });
      });
      setRecipes(items.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "recipes");
    });

    return () => {
      unsubscribePin();
      unsubscribeRate();
      unsubscribeProducts();
      unsubscribeSales();
      unsubscribePurchases();
      unsubscribeExpenses();
      unsubscribeReturns();
      unsubscribeProviders();
      unsubscribeRaw();
      unsubscribeRecipes();
    };
  }, []);

  // Handler for Rate updates
  const handleUpdateExchangeRate = async (newRate: number) => {
    try {
      const rateDocRef = doc(db, "settings", "rate");
      await setDoc(rateDocRef, { rate: newRate }, { merge: true });
      setExchangeRate(newRate);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "settings/rate");
    }
  };

  // Handler for Admin PIN updates
  const handleUpdateAdminPin = async (newPin: string) => {
    try {
      const pinDocRef = doc(db, "settings", "admin");
      await setDoc(pinDocRef, { pin: newPin }, { merge: true });
      setAdminPin(newPin);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "settings/admin");
    }
  };

  // Handler for WhatsApp store number updates
  const handleUpdateStoreWhatsapp = async (newWhatsapp: string) => {
    try {
      const pinDocRef = doc(db, "settings", "admin");
      await setDoc(pinDocRef, { whatsapp: newWhatsapp }, { merge: true });
      setStoreWhatsapp(newWhatsapp);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "settings/admin");
    }
  };

  // Handler for Recovery options update
  const handleUpdateRecoverySettings = async (email: string, question: string, answer: string) => {
    try {
      const pinDocRef = doc(db, "settings", "admin");
      await setDoc(pinDocRef, {
        recoveryEmail: email.trim(),
        securityQuestion: question,
        securityAnswer: answer.trim().toLowerCase()
      }, { merge: true });
      setRecoveryEmail(email.trim());
      setSecurityQuestion(question);
      setSecurityAnswer(answer.trim().toLowerCase());
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "settings/admin");
    }
  };

  // Product CRUD
  const handleAddProduct = async (productData: Omit<Product, "id">) => {
    try {
      const cleanData = cleanUndefined({
        ...productData,
        createdAt: new Date().toISOString()
      });
      await addDoc(collection(db, "inventory"), cleanData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "inventory");
    }
  };

  const handleUpdateProduct = async (id: string, productData: Partial<Product>) => {
    try {
      const productRef = doc(db, "inventory", id);
      const cleanData = cleanUndefined(productData);
      await updateDoc(productRef, cleanData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "inventory");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, "inventory", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "inventory");
    }
  };

  // POS / Sales CRUD
  const handleCreateSale = async (saleData: Omit<Sale, "id">) => {
    try {
      // 1. Record the sale in Firestore
      const cleanSale = cleanUndefined({
        ...saleData,
        date: saleData.date || new Date().toISOString()
      });
      await addDoc(collection(db, "sales"), cleanSale);

      // 2. Deduct inventory stock for sold items
      for (const item of saleData.items) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          const newStock = Math.max(0, prod.stock - item.quantity);
          const prodRef = doc(db, "inventory", prod.id);
          await updateDoc(prodRef, { stock: newStock });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "sales");
    }
  };

  const handleUpdateSale = async (id: string, updatedFields: Partial<Sale>) => {
    try {
      const saleRef = doc(db, "sales", id);
      const cleanData = cleanUndefined(updatedFields);
      await updateDoc(saleRef, cleanData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "sales");
    }
  };

  const handleDeleteSale = async (id: string) => {
    try {
      await deleteDoc(doc(db, "sales", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "sales");
    }
  };

  // Purchases CRUD
  const handleAddPurchase = async (pData: Omit<Purchase, "id" | "createdAt">) => {
    try {
      // If provider has details, save/update provider in the providers directory
      if (pData.provider && pData.provider.trim()) {
        const existingProv = providers.find(
          (pr) => pr.name.toLowerCase() === pData.provider.trim().toLowerCase()
        );
        if (existingProv) {
          if (pData.providerRif || pData.providerAddress) {
            const provRef = doc(db, "providers", existingProv.id);
            await updateDoc(provRef, cleanUndefined({
              rif: pData.providerRif || existingProv.rif,
              address: pData.providerAddress || existingProv.address
            }));
          }
        } else {
          await addDoc(collection(db, "providers"), cleanUndefined({
            name: pData.provider.trim(),
            rif: pData.providerRif || "",
            phone: "",
            address: pData.providerAddress || "",
            createdAt: new Date().toISOString()
          }));
        }
      }

      const cleanData = cleanUndefined({
        ...pData,
        createdAt: new Date().toISOString()
      });
      await addDoc(collection(db, "purchases"), cleanData);

      // Increase stock for purchase items
      if (pData.items && pData.items.length > 0) {
        for (const item of pData.items) {
          const prod = products.find((p) => p.name.toLowerCase() === item.productName.toLowerCase());
          if (prod) {
            const newStock = prod.stock + item.quantity;
            const prodRef = doc(db, "inventory", prod.id);
            await updateDoc(prodRef, {
              stock: newStock,
              costUSD: item.costUSD || prod.costUSD
            });
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "purchases");
      throw error;
    }
  };

  const handleAddPurchasesBulk = async (pList: Omit<Purchase, "id" | "createdAt">[]) => {
    try {
      for (const pData of pList) {
        await handleAddPurchase(pData);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "purchases");
      throw error;
    }
  };

  const handleUpdatePurchase = async (id: string, updatedFields: Partial<Purchase>) => {
    try {
      const pRef = doc(db, "purchases", id);
      const cleanData = cleanUndefined(updatedFields);
      await updateDoc(pRef, cleanData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "purchases");
    }
  };

  const handleDeletePurchase = async (id: string) => {
    try {
      await deleteDoc(doc(db, "purchases", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "purchases");
    }
  };

  // Expenses CRUD
  const handleAddExpense = async (expData: Omit<Expense, "id" | "createdAt">) => {
    try {
      const cleanData = cleanUndefined({
        ...expData,
        createdAt: new Date().toISOString()
      });
      await addDoc(collection(db, "expenses"), cleanData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "expenses");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, "expenses", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "expenses");
    }
  };

  // Returns CRUD
  const handleAddReturn = async (returnData: Omit<ReturnItem, "id" | "createdAt">) => {
    try {
      const cleanData = cleanUndefined({
        ...returnData,
        createdAt: new Date().toISOString()
      });
      await addDoc(collection(db, "returns"), cleanData);

      // If action is restock, restore inventory
      if (returnData.action === "restock") {
        const prod = products.find((p) => p.id === returnData.productId);
        if (prod) {
          const prodRef = doc(db, "inventory", prod.id);
          await updateDoc(prodRef, { stock: prod.stock + returnData.quantity });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "returns");
    }
  };

  const handleDeleteReturn = async (id: string) => {
    try {
      await deleteDoc(doc(db, "returns", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "returns");
    }
  };

  // Raw Materials CRUD
  const handleAddRawMaterial = async (data: Omit<RawMaterial, "id">) => {
    try {
      const cleanData = cleanUndefined({
        ...data,
        createdAt: new Date().toISOString()
      });
      await addDoc(collection(db, "raw_materials"), cleanData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "raw_materials");
    }
  };

  const handleUpdateRawMaterial = async (id: string, data: Partial<RawMaterial>) => {
    try {
      const rawRef = doc(db, "raw_materials", id);
      const cleanData = cleanUndefined(data);
      await updateDoc(rawRef, cleanData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "raw_materials");
    }
  };

  const handleDeleteRawMaterial = async (id: string) => {
    try {
      await deleteDoc(doc(db, "raw_materials", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "raw_materials");
    }
  };

  // Recipe CRUD & Production
  const handleSaveRecipe = async (recipeData: Omit<Recipe, "id" | "updatedAt">) => {
    try {
      const existing = recipes.find((r) => r.productId === recipeData.productId);
      if (existing) {
        const recRef = doc(db, "recipes", existing.id);
        await updateDoc(recRef, cleanUndefined({
          ...recipeData,
          updatedAt: new Date().toISOString()
        }));
      } else {
        await addDoc(collection(db, "recipes"), cleanUndefined({
          ...recipeData,
          updatedAt: new Date().toISOString()
        }));
      }

      // Also update the unit cost of the product in inventory
      const prod = products.find((p) => p.id === recipeData.productId);
      if (prod) {
        const prodRef = doc(db, "inventory", prod.id);
        await updateDoc(prodRef, { costUSD: recipeData.unitCostUSD });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "recipes");
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    try {
      await deleteDoc(doc(db, "recipes", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "recipes");
    }
  };

  const handleProduceBatch = async (recipe: Recipe, batches: number) => {
    try {
      // 1. Deduct raw materials
      for (const ing of recipe.ingredients) {
        const raw = rawMaterials.find((rm) => rm.id === ing.rawMaterialId);
        if (raw) {
          const totalUsed = ing.quantity * batches;
          const newStock = Math.max(0, raw.stock - totalUsed);
          const rawRef = doc(db, "raw_materials", raw.id);
          await updateDoc(rawRef, { stock: newStock });
        }
      }

      // 2. Increase finished product inventory
      const prod = products.find((p) => p.id === recipe.productId);
      if (prod) {
        const unitsProduced = (recipe.yieldUnits || 1) * batches;
        const prodRef = doc(db, "inventory", prod.id);
        await updateDoc(prodRef, {
          stock: prod.stock + unitsProduced,
          costUSD: recipe.unitCostUSD
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "recipes/produce");
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
          const id = item.id;
          const clean = cleanUndefined({ ...item });
          delete clean.id;
          await setDoc(doc(db, "sales", id), clean, { merge: true });
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
    setShowLoginModal(false);
    setActiveTab("pos");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800 selection:bg-amber-100 selection:text-amber-900">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Store Brand / Logo */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("catalog")}>
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-md shadow-amber-500/20 text-white">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                  SinGluten<span className="text-amber-600">pzo</span>
                </h1>
                <p className="text-[11px] font-bold text-slate-500 tracking-wider uppercase mt-0.5">
                  100% Libre de Gluten
                </p>
              </div>
            </div>

            {/* Admin Controls & Navigation Shortcuts */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Currency & Rate Display */}
              <div className="hidden md:flex items-center bg-slate-100/80 rounded-2xl p-1 border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setActiveCurrency("USD")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activeCurrency === "USD" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  $ USD
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCurrency("VES")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activeCurrency === "VES" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Bs VES
                </button>
              </div>

              {/* Admin Button */}
              {isAdmin ? (
                <div className="flex items-center space-x-2">
                  <span className="hidden sm:inline-flex items-center px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-extrabold rounded-full">
                    <Shield className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
                    Administrador
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdmin(false);
                      setActiveTab("catalog");
                    }}
                    className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
                    title="Cerrar sesión de administrador"
                  >
                    <LogOut className="h-4 w-4 text-slate-600" />
                    <span className="hidden sm:inline">Salir</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-extrabold shadow-sm transition-all flex items-center space-x-2 active:scale-95"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Acceso Administrador</span>
                </button>
              )}
            </div>
          </div>

          {/* Navigation Bar (When Admin is logged in) */}
          {isAdmin && (
            <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-3 pt-1 border-t border-slate-100 no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab("pos")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === "pos" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Punto de Venta</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("inventory")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === "inventory" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                <span>Inventario ({products.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("production")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === "production" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ChefHat className="h-3.5 w-3.5" />
                <span>Producción y Recetas</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("purchases")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === "purchases" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span>Compras ({purchases.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("expenses")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === "expenses" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span>Gastos Operativos</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("returns")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === "returns" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>Devoluciones</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("reports")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === "reports" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Reportes y Caja</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === "settings" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
