import { auth, db } from './firebase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { collection, getDocs, query, limit } from 'firebase/firestore';

export async function testConnections() {
  const results = {
    firebase: { connected: false, error: null as string | null },
    gemini: { connected: false, error: null as string | null }
  };

  // Test Firebase connection
  try {
    const q = query(collection(db, 'tasks'), limit(1));
    await getDocs(q);
    results.firebase.connected = true;
  } catch (error) {
    results.firebase.error = error instanceof Error ? error.message : 'Unknown error';
  }

  // Test Gemini API connection
  try {
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    await model.generateContent('Test connection');
    results.gemini.connected = true;
  } catch (error) {
    results.gemini.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return results;
}