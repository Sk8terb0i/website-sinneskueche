import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAzuoR6RXSW8tR68iETyAmrpVlhI6EHVdA",
  authDomain: "sinneskueche-atelier.firebaseapp.com",
  projectId: "sinneskueche-atelier",
  storageBucket: "sinneskueche-atelier.firebasestorage.app",
  messagingSenderId: "834937221281",
  appId: "1:834937221281:web:672f55196b0d614f27c0e0",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
