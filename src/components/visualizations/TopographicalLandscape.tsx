import { useEffect, useRef, useState } from 'react';
import { DatasetAccess } from '../DataJourneyDashboard';

interface TopographicalLandscapeProps {
  data: DatasetAccess[];
}

export const TopographicalLandscape = ({ data }: TopographicalLandscapeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    const animate = () => {
      // Sky gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
      gradient.addColorStop(0, '#87CEEB');
      gradient.addColorStop(1, '#98FB98');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Draw mountains based on dataset usage
      const datasets = ['customer_data', 'sales_reports', 'inventory_db', 'analytics_warehouse'];
      datasets.forEach((dataset, i) => {
        const x = (rect.width / datasets.length) * (i + 0.5);
        const height = 50 + Math.random() * 100;
        
        // Mountain shape
        ctx.fillStyle = `hsl(${120 + i * 30}, 70%, ${30 + height/5}%)`;
        ctx.beginPath();
        ctx.moveTo(x - 40, rect.height);
        ctx.lineTo(x, rect.height - height);
        ctx.lineTo(x + 40, rect.height);
        ctx.closePath();
        ctx.fill();

        // Label
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(dataset, x, rect.height - 10);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [data]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};