import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeUserData } from './lib/localData'

// Initialize user data from localStorage on app start
initializeUserData();

createRoot(document.getElementById("root")!).render(<App />);
