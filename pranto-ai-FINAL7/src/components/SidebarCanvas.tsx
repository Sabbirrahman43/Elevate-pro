import React, { useEffect, useRef } from 'react';

export const SidebarCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', resize);
    resize();

    // Animation state
    const update = () => {
      ctx.clearRect(0, 0, width, height);
      // Flat Slate Background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Subtle Scanline Effect - Static
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 1;
      for (let i = 0; i < height; i += 4) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }

      // Vertical RGB Edge line
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)'; // blue-500
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width - 1, 0);
      ctx.lineTo(width - 1, height);
      ctx.stroke();
    };

    update();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};
