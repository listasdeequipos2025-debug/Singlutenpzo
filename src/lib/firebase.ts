import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  collection as realCollection,
  doc as realDoc,
  onSnapshot as realOnSnapshot,
  addDoc as realAddDoc,
  updateDoc as realUpdateDoc,
  deleteDoc as realDeleteDoc,
  setDoc as realSetDoc,
  getDoc as realGetDoc
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase using the configuration provided in firebase-applet-config.json
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(
  app,
  {
    ignoreUndefinedProperties: true,
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId || "(default)"
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // If the fallback is active, we can ignore or gracefully swallow some errors to prevent crashing
  if (isFallbackActive) {
    console.warn("Swallowed Firestore error in fallback mode:", error);
    return;
  }
  
  throw new Error(JSON.stringify(errInfo));
}

// ----------------------------------------------------
// LOCAL STORAGE FALLBACK PERSISTENCE ENGINE
// ----------------------------------------------------
// If we are using placeholder credentials ("remixed-project-id"), fallback to LocalStorage immediately
let isFallbackActive = firebaseConfig.projectId === "remixed-project-id";

if (isFallbackActive) {
  console.log("Firebase is configured with placeholder project ID. Local storage fallback activated automatically.");
}

const getLocalCollection = (collectionName: string): Record<string, any> => {
  try {
    const data = localStorage.getItem(`fs_${collectionName}`);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
};

const saveLocalCollection = (collectionName: string, data: Record<string, any>) => {
  try {
    localStorage.setItem(`fs_${collectionName}`, JSON.stringify(data));
    triggerListeners(collectionName);
  } catch (e) {
    console.error("Local storage save error", e);
  }
};

// Real-time listener registry for LocalStorage
type ListenerCallback = (snapshot: any) => void;
const listeners = new Map<string, Set<{ id: string; callback: ListenerCallback }>>();

const registerListener = (path: string, callback: ListenerCallback) => {
  const id = Math.random().toString(36).substring(2);
  if (!listeners.has(path)) {
    listeners.set(path, new Set());
  }
  listeners.get(path)!.add({ id, callback });
  
  // Trigger immediately with current data
  triggerListenerForPath(path, callback);

  return () => {
    const pathListeners = listeners.get(path);
    if (pathListeners) {
      for (const item of pathListeners) {
        if (item.id === id) {
          pathListeners.delete(item);
          break;
        }
      }
    }
  };
};

const triggerListeners = (collectionName: string) => {
  // Trigger collection listeners
  const collectionListeners = listeners.get(collectionName);
  if (collectionListeners) {
    for (const item of collectionListeners) {
      triggerListenerForPath(collectionName, item.callback);
    }
  }
  // Trigger individual document listeners
  for (const [path, set] of listeners.entries()) {
    if (path.startsWith(`${collectionName}/`)) {
      for (const item of set) {
        triggerListenerForPath(path, item.callback);
      }
    }
  }
};

const triggerListenerForPath = (path: string, callback: ListenerCallback) => {
  const parts = path.split("/");
  if (parts.length === 1) {
    // Collection snapshot
    const collectionName = parts[0];
    const data = getLocalCollection(collectionName);
    const docs = Object.entries(data).map(([id, docData]) => ({
      id,
      data: () => docData,
      exists: () => true,
    }));
    
    const snapshot = {
      forEach: (cb: (doc: any) => void) => {
        docs.forEach(cb);
      },
      docs,
      size: docs.length,
      empty: docs.length === 0,
    };
    callback(snapshot);
  } else {
    // Document snapshot
    const [collectionName, docId] = parts;
    const data = getLocalCollection(collectionName);
    const docData = data[docId];
    const exists = !!docData;
    
    const docSnap = {
      id: docId,
      exists: () => exists,
      data: () => docData || {},
    };
    callback(docSnap);
  }
};

// ----------------------------------------------------
// PROXIED FIRESTORE CLIENT FUNCTIONS
// ----------------------------------------------------
export function collection(dbRef: any, path: string, ...pathSegments: string[]): any {
  if (!isFallbackActive) {
    try {
      return realCollection(dbRef, path, ...pathSegments);
    } catch (e) {
      console.warn("Real Firestore collection failed, activating fallback:", e);
      isFallbackActive = true;
    }
  }
  const fullPath = [path, ...pathSegments].filter(Boolean).join("/");
  return {
    _type: "collection",
    path: fullPath,
  };
}

export function doc(dbOrCol: any, path?: string, ...pathSegments: string[]): any {
  if (!isFallbackActive) {
    try {
      if (path) {
        return realDoc(dbOrCol, path, ...pathSegments);
      } else {
        return realDoc(dbOrCol);
      }
    } catch (e) {
      console.warn("Real Firestore doc failed, activating fallback:", e);
      isFallbackActive = true;
    }
  }
  
  let basePath = "";
  if (typeof dbOrCol === "string") {
    basePath = dbOrCol;
  } else if (dbOrCol && dbOrCol._type === "collection") {
    basePath = dbOrCol.path;
  } else if (dbOrCol && dbOrCol.path) {
    basePath = dbOrCol.path;
  }

  const fullPath = [basePath, path, ...pathSegments].filter(Boolean).join("/");
  return {
    _type: "document",
    path: fullPath,
    id: fullPath.split("/").pop() || "",
  };
}

export function onSnapshot(
  ref: any,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
): () => void {
  let unsubscribeReal: (() => void) | null = null;
  let unsubscribeFallback: (() => void) | null = null;
  let isUnsubscribed = false;

  const handleFallback = () => {
    if (isUnsubscribed || unsubscribeFallback) return;
    if (unsubscribeReal) {
      try { unsubscribeReal(); } catch (e) {}
    }
    const path = ref.path || ref.id || "";
    unsubscribeFallback = registerListener(path, onNext);
  };

  if (!isFallbackActive) {
    try {
      unsubscribeReal = realOnSnapshot(
        ref,
        onNext,
        (error) => {
          console.warn("Real Firestore onSnapshot failed at runtime, switching to fallback:", error);
          isFallbackActive = true;
          handleFallback();
        }
      );
    } catch (e) {
      console.warn("Real Firestore onSnapshot setup failed, switching to fallback:", e);
      isFallbackActive = true;
      handleFallback();
    }
  } else {
    handleFallback();
  }

  return () => {
    isUnsubscribed = true;
    if (unsubscribeReal) {
      try { unsubscribeReal(); } catch (e) {}
    }
    if (unsubscribeFallback) {
      unsubscribeFallback();
    }
  };
}

export async function getDoc(ref: any): Promise<any> {
  if (!isFallbackActive) {
    try {
      return await realGetDoc(ref);
    } catch (e) {
      console.warn("Real Firestore getDoc failed, activating fallback:", e);
      isFallbackActive = true;
    }
  }

  const path = ref.path || "";
  const parts = path.split("/");
  const collectionName = parts[0];
  const docId = parts[1];

  const data = getLocalCollection(collectionName);
  const docData = data[docId];
  const exists = !!docData;

  // Settings/admin helper for default app PIN and whatsapp
  if (collectionName === "settings" && docId === "admin" && !exists) {
    return {
      id: docId,
      exists: () => true,
      data: () => ({ pin: "1234", whatsapp: "584120000000" })
    };
  }

  return {
    id: docId,
    exists: () => exists,
    data: () => docData || {},
  };
}

export async function setDoc(ref: any, data: any, options?: any): Promise<void> {
  if (!isFallbackActive) {
    try {
      await realSetDoc(ref, data, options);
      return;
    } catch (e) {
      console.warn("Real Firestore setDoc failed, activating fallback:", e);
      isFallbackActive = true;
    }
  }

  const path = ref.path || "";
  const parts = path.split("/");
  const collectionName = parts[0];
  const docId = parts[1];

  const collectionData = getLocalCollection(collectionName);
  if (options && options.merge) {
    collectionData[docId] = { ...collectionData[docId], ...data };
  } else {
    collectionData[docId] = data;
  }

  saveLocalCollection(collectionName, collectionData);
}

export async function addDoc(collectionRef: any, data: any): Promise<any> {
  if (!isFallbackActive) {
    try {
      return await realAddDoc(collectionRef, data);
    } catch (e) {
      console.warn("Real Firestore addDoc failed, activating fallback:", e);
      isFallbackActive = true;
    }
  }

  const collectionName = collectionRef.path || "";
  const docId = Math.random().toString(36).substring(2, 15);

  const collectionData = getLocalCollection(collectionName);
  collectionData[docId] = data;

  saveLocalCollection(collectionName, collectionData);

  return {
    id: docId,
    path: `${collectionName}/${docId}`,
  };
}

export async function updateDoc(ref: any, data: any): Promise<void> {
  if (!isFallbackActive) {
    try {
      await realUpdateDoc(ref, data);
      return;
    } catch (e) {
      console.warn("Real Firestore updateDoc failed, activating fallback:", e);
      isFallbackActive = true;
    }
  }

  const path = ref.path || "";
  const parts = path.split("/");
  const collectionName = parts[0];
  const docId = parts[1];

  const collectionData = getLocalCollection(collectionName);
  collectionData[docId] = { ...collectionData[docId], ...data };

  saveLocalCollection(collectionName, collectionData);
}

export async function deleteDoc(ref: any): Promise<void> {
  if (!isFallbackActive) {
    try {
      await realDeleteDoc(ref);
      return;
    } catch (e) {
      console.warn("Real Firestore deleteDoc failed, activating fallback:", e);
      isFallbackActive = true;
    }
  }

  const path = ref.path || "";
  const parts = path.split("/");
  const collectionName = parts[0];
  const docId = parts[1];

  const collectionData = getLocalCollection(collectionName);
  if (collectionData[docId]) {
    delete collectionData[docId];
    saveLocalCollection(collectionName, collectionData);
  }
}

export { app, db };


