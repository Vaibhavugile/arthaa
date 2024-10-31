// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDhYlYfBnliwe-H-glpu5eBfNE5jH2sYhg",
  authDomain: "foodapp-ea4d7.firebaseapp.com",
  projectId: "foodapp-ea4d7",
  storageBucket: "foodapp-ea4d7.appspot.com",
  messagingSenderId: "490090160634",
  appId: "1:490090160634:web:eff6e8a9c00fdb2771c443",
  measurementId: "G-P1PR6CSRD8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
