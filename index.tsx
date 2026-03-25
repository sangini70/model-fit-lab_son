import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Simple check to ensure environment is okay, though in a real app this might be handled differently
if (!process.env.API_KEY) {
  console.warn("WARNING: process.env.API_KEY is missing. Gemini features will fail.");
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
