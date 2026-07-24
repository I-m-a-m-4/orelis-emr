
'use client';
import { useRef, useEffect } from 'react';
import Image from 'next/image';

export const HomepageRollingGallery = () => {
    const galleryCylinderRef = useRef<HTMLDivElement>(null);
    const IMGS = [
  "/nurse.jpg",
      "https://images.unsplash.com/photo-1584515933487-779824d29309?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?q=80&w=800&auto=format&fit=crop",
      "/hospital.jpg",
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=800&auto=format&fit=crop",
      "/theatre.jpg",
      "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?q=80&w=800&auto=format&fit=crop",
      "/emr.jpg"
    ];

    useEffect(() => {
        if (typeof window === 'undefined' || !galleryCylinderRef.current) return;

        let galleryElement = galleryCylinderRef.current;
        let rotation = 0;
        let isDragging = false;
        let dragStart = 0;
        let velocity = -0.05; // Start with a slow auto-rotation
        let animationFrameId: number;

        const updateGallery = () => {
            if (!isDragging) {
                rotation += velocity;
                velocity *= 0.95; // Apply friction to slow down
                if (Math.abs(velocity) < 0.01) {
                    velocity = -0.05; // Re-apply auto-rotation if it stops
                }
            }
            if (galleryElement) {
                galleryElement.style.transform = `rotateY(${rotation}deg)`;
            }
            animationFrameId = requestAnimationFrame(updateGallery);
        };

        const handleMouseDown = (e: MouseEvent) => {
            isDragging = true;
            dragStart = e.clientX;
            velocity = 0; // Stop auto-rotation on drag
            if (galleryElement) {
                galleryElement.style.transition = 'none';
                galleryElement.style.cursor = 'grabbing';
            }
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            updateGallery();
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const deltaX = e.clientX - dragStart;
            rotation += deltaX * 0.2; // Drag speed factor
            velocity = deltaX * 0.1; // Set velocity for inertia
            dragStart = e.clientX;
        };

        const handleMouseUp = () => {
            isDragging = false;
            if (galleryElement) {
                galleryElement.style.cursor = 'grab';
            }
        };

        const handleTouchStart = (e: TouchEvent) => {
            isDragging = true;
            dragStart = e.touches[0].clientX;
            velocity = 0;
             if (galleryElement) {
                galleryElement.style.transition = 'none';
            }
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            updateGallery();
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging) return;
            const deltaX = e.touches[0].clientX - dragStart;
            rotation += deltaX * 0.2;
            velocity = deltaX * 0.1;
            dragStart = e.touches[0].clientX;
        };

        const handleTouchEnd = () => {
            isDragging = false;
        };

        const parent = galleryElement.parentElement;
        parent?.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        parent?.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', handleTouchEnd);

        updateGallery();

        return () => {
            parent?.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            parent?.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            cancelAnimationFrame(animationFrameId);
        };
    }, [IMGS]);

    return (
        <div className="relative w-full min-h-[500px] h-[75vh] flex items-center justify-center overflow-hidden">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.7)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.05] [mask-image:radial-gradient(80%_80%_at_50%_50%,black,transparent)]"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center w-full h-full pointer-events-none z-10">
            <div className="relative flex items-center justify-center w-full h-full">
                <div className="absolute left-0 top-0 w-[120px] h-full z-20 gradient-left pointer-events-none"></div>
                <div className="absolute right-0 top-0 w-[120px] h-full z-20 gradient-right pointer-events-none"></div>
                <div className="flex w-full h-[400px] items-center justify-center gallery-container-y pointer-events-auto">
                <div ref={galleryCylinderRef} id="galleryCylinderY" className="gallery-cylinder-y flex items-center justify-center" style={{cursor: 'grab'}}>
                    {IMGS.map((url, i) => {
                    const circumference = (typeof window !== 'undefined' && window.innerWidth <= 640) ? 2200 : 2400;
                    const radius = circumference / (2 * Math.PI);
                    const angle = (360 / IMGS.length) * i;
                    return (
                        <div key={i} className='gallery-face-y group absolute flex items-center justify-center p-[4%]' style={{ transform: `rotateY(${angle}deg) translateZ(${radius}px)` }}>
                        <div className="flex items-center justify-center rounded-[24px] transition-transform duration-300 ease-out group-hover:scale-105 shadow-lg" style={{ width: '280px', height: '320px', overflow: 'hidden' }}>
                            <Image src={url} alt={`Orelis themed image ${i + 1}`} width={280} height={320} className="pointer-events-none h-full w-full object-cover" draggable="false" />
                        </div>
                        </div>
                    );
                    })}
                </div>
                </div>
            </div>
            </div>
        </div>
    );
};
