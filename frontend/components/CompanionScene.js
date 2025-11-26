import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, Sphere } from '@react-three/drei';

function CompanionMesh({ isSpeaking }) {
  const mesh = useRef();
  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);

  useFrame((state, delta) => {
    if (mesh.current) {
      mesh.current.rotation.x += delta * 0.5;
      mesh.current.rotation.y += delta * 0.2;

      // Simple animation when speaking
      if (isSpeaking) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.1;
        mesh.current.scale.set(scale, scale, scale);
      } else {
        mesh.current.scale.set(1, 1, 1);
      }
    }
  });

  return (
    <Sphere
      ref={mesh}
      args={[1.5, 32, 32]}
      onClick={(event) => setActive(!active)}
      onPointerOver={(event) => setHover(true)}
      onPointerOut={(event) => setHover(false)}
    >
      <meshStandardMaterial color={hovered ? 'hotpink' : isSpeaking ? '#4fd1c5' : 'orange'} />
    </Sphere>
  );
}

export default function CompanionScene({ isSpeaking }) {
  return (
    <Canvas style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
      <pointLight position={[-10, -10, -10]} />
      <CompanionMesh isSpeaking={isSpeaking} />
    </Canvas>
  );
}
