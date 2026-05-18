import React from 'react';
import ReactDOM from 'react-dom/client';
import { initClient } from '@uxco/glitchtip/react';
import { App } from './App';

initClient({
  dsn: import.meta.env.VITE_GLITCHTIP_DSN,
  environment: import.meta.env.VITE_APP_ENV ?? 'development',
  release: 'demo-react@0.0.0',
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
