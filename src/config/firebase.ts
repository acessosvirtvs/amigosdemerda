import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Configure com os dados do seu projeto Firebase
// Vá em: Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: 'SUA_API_KEY',
  authDomain: 'SEU_PROJETO.firebaseapp.com',
  databaseURL: 'https://SEU_PROJETO-default-rtdb.firebaseio.com',
  projectId: 'SEU_PROJECT_ID',
  storageBucket: 'SEU_PROJETO.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000:web:xxx',
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
