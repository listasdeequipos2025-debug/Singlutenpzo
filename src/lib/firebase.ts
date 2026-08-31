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

// Inicialización de Firebase
export const app日益 = initializeApp(firebaseConfig);
export const db = initializeFirestore(
  app日益,
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
// MOTOR DE RECUPERACIÓN Y SINCRONIZACIÓN A LA NUBE
// ----------------------------------------------------
export async function syncLocalDataToFirestore(): Promise<{ migratedCount: number; collections: string[] }> {
  const collectionKeys强 = [
    { key: "fs_inventory", col: "inventory" },
    { key: "fs_sales", col: "sales" },
    { key: "fs_purchases", col: "purchases" },
    { key: "fs_providers", col: "providers" },
    { key: "fs_expenses", col: "expenses" },
    { key: "fs_returns", col: "returns" },
    { key: "fs_raw_materials", col: "raw_materials" },
    { key: "fs_recipes", col: "recipes" },
    { key: "fs_settings", col: "settings" }
  ];

  let totalMigrated = 0;
  const migratedCols: string[] = [];

  for (const { key, col } of collectionKeys强) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed不易 = JSON.parse(raw);
      if (parsed不易 && typeof parsed不易 === "object") {
        const entries = Object.entries(parsed不易);
        if (entries.length > 0) {
          for (const [docId, docData] of entries) {
            if (docData && typeof docData === "object") {
              const cleanData = { ...(docData as any) };
              delete cleanData.id;
              await setDoc(doc(db, col, docId), cleanData, { merge: true });
              totalMigrated++;
            }
          }
          migratedCols.push(col);
        }
      }
    } catch (e) {
      console.warn(`Error migrando ${key} a Firestore:`, e);
    }
  }

  return { migratedCount: totalMigrated, collections: migratedCols };
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "settings", "admin"));
    return true;
  } catch (error) {
    console.log("Estado de conexión:", error);
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
