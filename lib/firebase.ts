import { initializeApp, getApps } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const storage = getStorage(app);

export async function uploadReportPDF(reportId: string, pdfBlob: Blob): Promise<string> {
  try {
    const storageRef = ref(storage, `reports/${reportId}.pdf`);
    await uploadBytes(storageRef, pdfBlob);
    return getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
}

export async function getReportPDFUrl(reportId: string): Promise<string> {
  try {
    const storageRef = ref(storage, `reports/${reportId}.pdf`);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error getting PDF URL:', error);
    throw error;
  }
}

export { app, storage };
