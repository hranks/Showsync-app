// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: "dj-ledger-lqo8g",
  appId: "1:680688018148:web:4c7e744589aaafa71c02f1",
  storageBucket: "dj-ledger-lqo8g.firebasestorage.app",
  apiKey: "AIzaSyDE7v3iH97x75hVNoFbNT-vR_nwwltjPxQ",
  authDomain: "dj-ledger-lqo8g.firebaseapp.com",
  messagingSenderId: "680688018148",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
