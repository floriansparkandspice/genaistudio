if (typeof window !== 'undefined' && window.location.hostname.includes('ai.studio')) {
  window.location.replace('https://genaistudio.one' + window.location.pathname + window.location.search);
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
