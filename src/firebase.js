import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyAzuoR6RXSW8tR68iETyAmrpVlhI6EHVdA",
  authDomain: "sinneskueche-atelier.firebaseapp.com",
  projectId: "sinneskueche-atelier",
  storageBucket: "sinneskueche-atelier.firebasestorage.app",
  messagingSenderId: "834937221281",
  appId: "1:834937221281:web:672f55196b0d614f27c0e0",
};

const app = initializeApp(firebaseConfig);

const RECAPTCHA_ENTERPRISE_KEY_ID = "6LfwijUuAAAAAKBxG3c_Pz9mJFkQihZ1_UKksBqA";

if (typeof window !== "undefined") {
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_KEY_ID),
    isTokenAutoRefreshEnabled: true,
  });
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
