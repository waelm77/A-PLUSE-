import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBXsww4lsHZdLF_YEdvrgPJy228GGEKYlI",
  authDomain: "wael-educatinal-website.firebaseapp.com",
  projectId: "wael-educatinal-website",
  storageBucket: "wael-educatinal-website.firebasestorage.app",
  messagingSenderId: "598561318270",
  appId: "1:598561318270:web:e01695ba0339d26f90bf2f",
  measurementId: "G-SMBXPYLXE8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
