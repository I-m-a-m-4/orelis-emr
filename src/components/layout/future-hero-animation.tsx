
'use client';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';

export function FutureHeroAnimation() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, stars: THREE.Points;

    const init = () => {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(60, mountRef.current!.clientWidth / mountRef.current!.clientHeight, 1, 1000);
      camera.position.z = 1;
      camera.rotation.x = Math.PI / 2;

      renderer = new THREE.WebGLRenderer({
        canvas: mountRef.current!.querySelector('canvas') as HTMLCanvasElement,
        alpha: true,
      });
      renderer.setSize(mountRef.current!.clientWidth, mountRef.current!.clientHeight);

      const starGeo = new THREE.BufferGeometry();
      const starVertices = [];
      for (let i = 0; i < 6000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starVertices.push(x, y, z);
      }
      starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));

      const starMaterial = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 0.7,
      });

      stars = new THREE.Points(starGeo, starMaterial);
      scene.add(stars);

      animate();
    };

    const animate = () => {
      stars.rotation.y += 0.0002;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    const onResize = () => {
      if (mountRef.current) {
        camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', onResize);
    init();

    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="pointer-events-none relative h-full w-full overflow-hidden md:pointer-events-auto light:mix-blend-normal z-0 col-span-full aspect-[3/2] max-w-[700px] mix-blend-lighten lg:absolute lg:-top-[clamp(20px,11dvh,130px)] lg:-right-12 lg:aspect-[4/3] lg:max-h-[clamp(650px,50vw,1000px)] lg:w-[clamp(600px,54vw,1000px)] lg:max-w-none 2xl:-right-2"
      style={{ opacity: 1, transform: 'translate(0px, 0px)', visibility: 'inherit' }}
    >
      <div style={{ width: '100%', height: '100%' }}>
        <canvas style={{ verticalAlign: 'top' }} />
      </div>
    </div>
  );
}

    