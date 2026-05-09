// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const hasFirebase = !!(firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY");

let app: ReturnType<typeof initializeApp> = null as unknown as ReturnType<typeof initializeApp>;
let auth: ReturnType<typeof getAuth> = null as unknown as ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore> = null as unknown as ReturnType<typeof getFirestore>;

if (hasFirebase) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.warn("Firebase initialization failed, using localStorage mode.", e);
  }
}

export { app, auth, db };
