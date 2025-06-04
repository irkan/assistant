import React, { Suspense, useRef, useEffect, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { Model, AylaModelRef } from '../character/Ayla';
import './Scene.css';

interface SceneProps {
  children?: ReactNode;
  aylaModelRef?: React.RefObject<AylaModelRef>;
}

const Scene = ({ children, aylaModelRef }: SceneProps) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (canvasContainerRef.current) {
        const canvas = canvasContainerRef.current.querySelector('canvas');
        if (canvas) {
          canvas.style.width = '100%';
          canvas.style.height = '100%';
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call once on mount

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="scene-container">
      {/* Background image */}
      <div 
        className="background-image" 
        style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/background.jpg)` }}
      />
      
      <div className="canvas-container" ref={canvasContainerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <Canvas style={{ background: 'transparent' }}>
          <Suspense fallback={null}>
            <PerspectiveCamera makeDefault position={[0, 0, 1]} fov={50} />
            <OrbitControls target={[0, 0, 0]} />

            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />

            {/* Render children here */}
            {children}

            {/* Ayla character model */}
            <Model position={[0, -1.4, 0]} ref={aylaModelRef} />

            <Environment preset="sunset" />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
};

export default Scene; 