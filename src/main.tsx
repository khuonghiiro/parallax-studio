import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App.js';

/**
 * Parallax Studio — Application Entry Point
 */
const root = document.getElementById('root');

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
