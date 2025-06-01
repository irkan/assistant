import React, { Suspense, useRef, useEffect, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { Model, AylaModelRef } from '../character/Ayla';
import LipSyncIntegration, { LipSyncRef } from '../LipSyncIntegration';
import './Scene.css';

interface SceneProps {
  children?: ReactNode;
  lipSyncRef?: React.RefObject<LipSyncRef>;
}

const Scene = ({ children, lipSyncRef: externalLipSyncRef }: SceneProps) => {
  const characterRef = useRef<AylaModelRef>(null);
  const internalLipSyncRef = useRef<LipSyncRef>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Use external ref if provided, otherwise use internal ref
  const lipSyncRef = externalLipSyncRef || internalLipSyncRef;

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

    // Initial sizing
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Test lipsync funksionallığı (development üçün)
  useEffect(() => {
    const testLipSync = () => {
      if (lipSyncRef.current) {
        console.log('🎭 Testing lip sync functionality...');
        lipSyncRef.current.speakText('Salam! Mən Ayla. Bu bir test mesajıdır.');
      }
    };

    // 3 saniyə gözlədikdən sonra test et
    const timeout = setTimeout(testLipSync, 3000);
    return () => clearTimeout(timeout);
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
            <Model ref={characterRef} position={[0, -1.4, 0]} />

            <Environment preset="sunset" />
          </Suspense>
        </Canvas>
      </div>

      {/* LipSync Integration - invisible component */}
      <LipSyncIntegration 
        ref={lipSyncRef}
        characterRef={characterRef}
      />
    </div>
  );
};

export default Scene; 