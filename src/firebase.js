// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCTQLc_acYANwXXhr2tLxVLU2mqtF4QCjk",
  authDomain: "angels-calendar-2026.firebaseapp.com",
  projectId: "angels-calendar-2026",
  storageBucket: "angels-calendar-2026.firebasestorage.app",
  messagingSenderId: "113168189254",
  appId: "1:113168189254:web:978b2cf2e5c570137b4747"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Import and initialize Firestore
import { getFirestore } from "firebase/firestore";
export const db = getFirestore(app);