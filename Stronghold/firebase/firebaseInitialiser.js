// Import the functions you need from the SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-firestore.js';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

export const firebaseConfig = {
  apiKey: "AIzaSyDSkowGJy61HdMcd5qJALvDX-T-tN2LCZo",
  authDomain: "stronghold-e0ef2.firebaseapp.com",
  projectId: "stronghold-e0ef2",
  storageBucket: "stronghold-e0ef2.firebasestorage.app",
  messagingSenderId: "826887391925",
  appId: "1:826887391925:web:93a085c7c44fa0024f4cfc",
  measurementId: "G-H0MT72Y523"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);