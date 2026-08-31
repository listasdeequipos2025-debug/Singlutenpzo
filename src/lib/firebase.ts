import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  getDocs,
  getDocFromServer
} from "firebase/firestore";
import rawFirebaseConfig from "../../firebase-applet-config.json";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || rawFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || rawFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || rawFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || rawFirebaseConfig.appId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || rawFirebaseConfig.firestoreDatabaseId || "(default)"
};

export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(
  app,
  {
    ignoreUndefinedProperties: true
  },
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
    ? firebaseConfig.firestoreDatabaseId
    : undefined
);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ----------------------------------------------------
// MOTOR DE ESCANEO PROFUNDO Y RECUPERACIÓN A FIREBASE
// ----------------------------------------------------
export async function syncLocalDataToFirestore(): Promise<{ migratedCount: number; collections: string[] }> {
  const collectionKeys = [
    { key: "fs_inventory", col: "inventory" },
    { key: "singluten_products", col: "inventory" },
    { key: "inventory", col: "inventory" },
    { key: "products", col: "inventory" },

    { key: "fs_sales", col: "sales" },
    { key: "singluten_sales", col: "sales" },
    { key: "sales", col: "sales" },

    { key: "fs_purchases", col: "purchases" },
    { key: "singluten_purchases", col: "purchases" },
    { key: "purchases", col: "purchases" },

    { key: "fs_providers", col: "providers" },
    { key: "singluten_providers", col: "providers" },
    { key: "providers", col: "providers" },

    { key: "fs_expenses", col: "expenses" },
    { key: "singluten_expenses", col: "expenses" },
    { key: "expenses", col: "expenses" },

    { key: "fs_returns", col: "returns" },
    { key: "singluten_returns", col: "returns" },
    { key: "returns", col: "returns" },

    { key: "fs_raw_materials", col: "raw_materials" },
    { key: "singluten_raw_materials", col: "raw_materials" },
    { key: "raw_materials", col: "raw_materials" },

    { key: "fs_recipes", col: "recipes" },
    { key: "singluten_recipes", col: "recipes" },
    { key: "recipes", col: "recipes" },

    { key: "fs_settings", col: "settings" },
    { key: "singluten_settings", col: "settings" },
    { key: "settings", col: "settings" }
  ];

  let totalMigrated = 0;
  const migratedCols: string[] = [];

  for (const { key, col } of collectionKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed) {
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const item of parsed) {
            if (item && typeof item === "object") {
              const docId = item.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              const cleanData = { ...item };
              delete cleanData.id;
              await setDoc(doc(db, col, String(docId)), cleanData, { merge: true });
              totalMigrated++;
            }
          }
          if (!migratedCols.includes(col)) migratedCols.push(col);
        } else if (typeof parsed === "object" && Object.keys(parsed).length > 0) {
          const entries = Object.entries(parsed);
          for (const [docId, docData] of entries) {
            if (docData && typeof docData === "object") {
              const cleanData = { ...(docData as any) };
              delete cleanData.id;
              await setDoc(doc(db, col, String(docId)), cleanData, { merge: true });
              totalMigrated++;
            }
          }
          if (!migratedCols.includes(col)) migratedCols.push(col);
        }
      }
    } catch (e) {
      console.warn(`Error migrando ${key}:`, e);
    }
  }

  return { migratedCount: totalMigrated, collections: migratedCols };
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "settings", "admin"));
    return true;
  } catch (error) {
    return true;
  }
}

export {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  getDocs,
  getDocFromServer
};
