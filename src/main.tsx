import React from 'react';
import ReactDOM from 'react-dom/client';

/**
 * Parallax Studio — Application Entry Point
 *
 * The editor UI will be built in Milestone 1 using the architecture
 * defined in packages/. This is a clean placeholder that confirms
 * the build toolchain works.
 */
function App(): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#1a1a2e',
        color: '#e0e0e0',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
          Parallax Studio
        </h1>
        <p style={{ opacity: 0.6 }}>
          Milestone 0 complete — packages ready for implementation
        </p>
      </div>
    </div>
  );
}

const root = document.getElementById('root');

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
