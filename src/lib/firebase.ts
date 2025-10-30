/**
 * @fileOverview Firebase configuration and initialization for the Red Mansion platform.
 *
 * This file handles Firebase Firestore and Storage setup for data persistence.
 * Authentication has been migrated to NextAuth.js (Phase 4 - SQLITE-022).
 *
 * This file provides:
 * - App initialization with environment-based configuration
 * - Firestore database for community posts, notes, highlights, and user data
 * - Cloud Storage for file uploads and assets
 * - Development debugging and error handling
 *
 * The configuration uses environment variables for security and flexibility
 * across different deployment environments (development, staging, production).
 */

// Import Firebase core functionality
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
// Import Firebase services for database and storage functionality
import { getFirestore } from 'firebase/firestore'; // Database for storing user data and progress
import { getStorage } from 'firebase/storage'; // File storage for user uploads and assets
// import { getAnalytics } from "firebase/analytics"; // Analytics for usage tracking and insights

/**
 * Firebase configuration object
 * 
 * All values are loaded from environment variables prefixed with NEXT_PUBLIC_
 * to ensure they are available on both client and server sides.
 * 
 * Environment variables must be set in .env.local file:
 * - NEXT_PUBLIC_FIREBASE_API_KEY: Firebase project API key
 * - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: Authentication domain
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID: Unique project identifier
 * - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: Cloud storage bucket name
 * - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: FCM sender ID
 * - NEXT_PUBLIC_FIREBASE_APP_ID: Firebase app identifier
 * - NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: Google Analytics measurement ID
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// --- DEBUGGING LOG ---
// This log will appear in your SERVER-SIDE terminal when the app starts (or on first import).
// Check if these values match exactly what's in your Firebase project console.
console.log("Firebase Initialization Attempting with:");
console.log("Project ID:", firebaseConfig.projectId);
console.log("Auth Domain:", firebaseConfig.authDomain);
if (!firebaseConfig.apiKey) {
  console.error("Firebase API Key is MISSING in .env file or not prefixed with NEXT_PUBLIC_!");
}
if (!firebaseConfig.projectId) {
  console.error("Firebase Project ID is MISSING in .env file or not prefixed with NEXT_PUBLIC_!");
}
// --- END DEBUGGING LOG ---

// Initialize Firebase
// This pattern prevents re-initializing the app on hot reloads in development
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app); // Firestore database for community posts and user data
const storage = getStorage(app); // Storage for user uploads and media files
// const analytics = getAnalytics(app); // Analytics for usage tracking and insights

// Note: Authentication has been migrated to NextAuth.js (Phase 4 - SQLITE-022)
// For authentication, use NextAuth session via getServerSession() or useSession()
export { app, db, storage };
