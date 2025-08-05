// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";   // <-- ADD THIS

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD7YHEorxupuI6df0FuZHsEkkYfXu7E0uY",
  authDomain: "skillnet-2021y2s2p1.firebaseapp.com",
  databaseURL: "https://skillnet-2021y2s2p1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "skillnet-2021y2s2p1",
  storageBucket: "skillnet-2021y2s2p1.appspot.com",
  messagingSenderId: "299208542119",
  appId: "1:299208542119:web:26d2bada4f1b7e718e1882",
  measurementId: "G-KCQT406BG0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);    // <-- EXPORT STORAGE

export default app;
