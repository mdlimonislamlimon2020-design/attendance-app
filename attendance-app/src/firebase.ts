// Firebase SDKs Import
import { initializeApp, deleteApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFunctions } from "firebase/functions";

// Firebase Configuration (সঠিক databaseURL সহ)
const firebaseConfig = {
  apiKey: "AIzaSyDp80S4nldAA8jvI6V0slSQWctzhaZ8e-o",
  authDomain: "titumir-attendance-b5173.firebaseapp.com",
  // 🟢 এখানে আপনার আসল সিঙ্গাপুর অঞ্চলের ডাটাবেজ ইউআরএল দেওয়া হলো
  databaseURL: "https://titumir-attendance-b5173-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "titumir-attendance-b5173",
  storageBucket: "titumir-attendance-b5173.firebasestorage.app",
  messagingSenderId: "679326106963",
  appId: "1:679326106963:web:0c499ec1f65b4fc1744da6",
  measurementId: "G-C41VH55EX5"
};

// Initialize App
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// 🟢 SDK এরর এড়াতে এখানে সরাসরি ইউআরএলটি পাস করা হয়েছে
export const db = getDatabase(app, firebaseConfig.databaseURL);
export const functions = getFunctions(app);

// Analytics Initialization (Safely handled for SSR/Browsers)
export let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// ফোন নম্বরকে ইমেইল ফরম্যাটে রূপান্তর
export function phoneToPseudoEmail(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  return `${cleaned}@student.attendance.app`;
}

export function teacherPhoneToPseudoEmail(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  return `${cleaned}@teacher.attendance.app`;
}

/**
 * অ্যাডমিন যখন নতুন শিক্ষকের অ্যাকাউন্ট তৈরি করবে,
 * তখন মূল সেশন অক্ষুণ্ণ রাখতে সেকেন্ডারি অ্যাপ ব্যবহার করা হবে।
 */
export async function createUserWithoutSigningIn(
  email: string,
  password: string
): Promise<string> {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = cred.user.uid;
    await signOut(secondaryAuth);
    return uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}
