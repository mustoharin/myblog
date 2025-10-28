import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Suppress findDOMNode warning from react-quill
// This is a known issue with react-quill v2.0.0 and React 18 StrictMode
// The warning is harmless and will be fixed in react-quill v3
const originalError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('findDOMNode')
  ) {
    return;
  }
  originalError.call(console, ...args);
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
