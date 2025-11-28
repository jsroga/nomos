import React from 'react';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';

function App() {
  return (
    <div className="flex w-screen h-screen bg-background text-foreground overflow-hidden">
      <div className="flex-1 relative">
        <Canvas />
      </div>
      <Sidebar />
    </div>
  );
}

export default App;
