// Firebase opsional: kalau env belum diisi, aplikasi tetap jalan tanpa fitur laporan.
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore, collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp,
} from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
export const firebaseReady = Boolean(config.apiKey && config.projectId);

let app = null, db = null, auth = null;
function init() {
  if (!firebaseReady) return false;
  if (!app) {
    app = getApps()[0] || initializeApp(config);
    db = getFirestore(app);
    auth = getAuth(app);
  }
  return true;
}

let authPromise = null;
function ensureUser() {
  if (!init()) return Promise.reject(new Error("firebase_off"));
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (!authPromise)
    authPromise = new Promise((resolve, reject) => {
      const off = onAuthStateChanged(auth, (u) => { if (u) { off(); resolve(u); } });
      signInAnonymously(auth).catch((e) => { off(); authPromise = null; reject(e); });
    });
  return authPromise;
}

// Dengarkan 500 laporan terbaru. Callback dapat array {id, masjidId, kebersihan, ..., ts(ms)}
export function subscribeReports(onData, onError) {
  if (!init()) return () => {};
  const q = query(collection(db, "laporan"), orderBy("ts", "desc"), limit(500));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => {
      const x = d.data({ serverTimestamps: "estimate" });
      return { id: d.id, ...x, ts: x.ts?.toMillis ? x.ts.toMillis() : Date.now() };
    })),
    (e) => onError && onError(e)
  );
}

export async function addReport(r) {
  const u = await ensureUser();
  const doc = { ...r, uid: u.uid, ts: serverTimestamp() };
  Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);
  await addDoc(collection(db, "laporan"), doc);
}
