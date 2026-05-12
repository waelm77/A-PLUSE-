import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDWkfygjx9Ju2nU08T6aFIQNovLcFI0bOY",
  authDomain: "apluswebsite-dd47a.firebaseapp.com",
  projectId: "apluswebsite-dd47a",
  storageBucket: "apluswebsite-dd47a.firebasestorage.app",
  messagingSenderId: "557329894023",
  appId: "1:557329894023:web:172080af9e2a6dc6ee4622",
  measurementId: "G-BGPY6YLCMB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
