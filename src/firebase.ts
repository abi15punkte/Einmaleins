import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD_XSqPcXXNNFnv06_07NVCP532seo8DI",
  authDomain: "einmaleins-c04f9.firebaseapp.com",
  projectId: "einmaleins-c04f9",
  storageBucket: "einmaleins-c04f9.firebasestorage.app",
  messagingSenderId: "710906928213",
  appId: "1:710906928213:web:c65d9b9b4a2832c98008dc"
};

const firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(firebaseApp);
export { firebaseApp };
