import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import {
initializeAppCheck,
ReCaptchaV3Provider,
} from "firebase/app-check";

const firebaseConfig = {
apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY;

if (import.meta.env.DEV) {
self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

if (import.meta.env.PROD && !recaptchaSiteKey) {
throw new Error(
"Missing VITE_RECAPTCHA_V3_SITE_KEY for production App Check."
);
}

initializeAppCheck(app, {
provider: new ReCaptchaV3Provider(
recaptchaSiteKey || "local-development-placeholder"
),
isTokenAutoRefreshEnabled: true,
});

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
