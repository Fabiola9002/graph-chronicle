import { useEffect, useRef, useState } from 'react';
import { DatasetAccess } from '../DataJourneyDashboard';

interface FluidParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  department: string;
  size: number;
  density: number;
  pressure: number;
}

interface FluidDynamicsFlowProps {
  data: DatasetAccess[];
}

export const FluidDynamicsFlow = ({ data }: FluidDynamicsFlowProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [particles, setParticles] = useState<FluidParticle[]>([]);

  const departmentColors = {
    Engineering: '#FF4444',
    Analytics: '#44AAFF', 
    Sales: '#44FF88',
    Marketing: '#FF4488',
    Operations: '#FFAA44'
  };

  useEffect(() => {
    if (!data.length) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(2, 2);

    // Create fluid particles based on department access patterns
    const departmentCounts = new Map<string, number>();
    data.forEach(access => {
      departmentCounts.set(access.department, (departmentCounts.get(access.department) || 0) + 1);
    });

    const fluidParticles: FluidParticle[] = [];
    const departments = Array.from(departmentCounts.keys());
    
    departments.forEach((dept, deptIndex) => {
      const count = departmentCounts.get(dept) || 0;
      const particleCount = Math.min(count * 2, 100);
      const color = departmentColors[dept as keyof typeof departmentColors] || '#888888';
      
      // Create inlet for each department
      const inletY = (rect.height / departments.length) * (deptIndex + 0.5);
      
      for (let i = 0; i < particleCount; i++) {
        fluidParticles.push({
          x: 10 + Math.random() * 50,
          y: inletY - 20 + Math.random() * 40,
          vx: 1 + Math.random() * 2,
          vy: (Math.random() - 0.5) * 0.5,
          color,
          department: dept,
          size: 2 + Math.random() * 3,
          density: 0.8 + Math.random() * 0.4,
          pressure: 0
        });
      }
    });

    setParticles(fluidParticles);
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      
      // Clear with dark blue fluid background
      const gradient = ctx.createLinearGradient(0, 0, rect.width, 0);
      gradient.addColorStop(0, '#001122');
      gradient.addColorStop(0.5, '#002244');
      gradient.addColorStop(1, '#001133');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Update fluid physics
      setParticles(prevParticles => {
        return prevParticles.map(particle => {
          // Reset forces
          let fx = 0, fy = 0;
          particle.pressure = 0;

          // Fluid flow towards center and right
          const flowForceX = 0.02;
          const flowForceY = (rect.height / 2 - particle.y) * 0.0005;
          
          fx += flowForceX;
          fy += flowForceY;

          // Pressure forces from nearby particles
          prevParticles.forEach(other => {
            if (other === particle) return;
            
            const dx = other.x - particle.x;
            const dy = other.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 15 && distance > 0) {
              // Pressure repulsion
              const pressure = (15 - distance) / 15;
              particle.pressure += pressure;
              
              const repulsionForce = pressure * 0.1;
              fx -= (dx / distance) * repulsionForce;
              fy -= (dy / distance) * repulsionForce;
              
              // Viscosity - velocity damping
              const viscosity = 0.02;
              fx += (other.vx - particle.vx) * viscosity;
              fy += (other.vy - particle.vy) * viscosity;
            }
          });

          // Turbulence at mixing areas
          const centerY = rect.height / 2;
          const distanceFromCenter = Math.abs(particle.y - centerY);
          if (particle.x > rect.width * 0.3 && particle.x < rect.width * 0.7 && distanceFromCenter < 50) {
            const turbulence = 0.005;
            fx += (Math.random() - 0.5) * turbulence;
            fy += (Math.random() - 0.5) * turbulence;
          }

          // Gravity and buoyancy
          const gravity = 0.01;
          const buoyancy = particle.density < 1 ? -gravity * (1 - particle.density) : 0;
          fy += gravity + buoyancy;

          // Update velocity with damping
          particle.vx = (particle.vx + fx) * 0.98;
          particle.vy = (particle.vy + fy) * 0.98;

          // Update position
          particle.x += particle.vx;
          particle.y += particle.vy;

          // Boundary conditions - flow out the right, wrap vertically
          if (particle.x > rect.width + 10) {
            particle.x = -10;
          }
          if (particle.y < 0) particle.y = rect.height;
          if (particle.y > rect.height) particle.y = 0;

          return particle;
        });
      });

      // Draw flow field background
      ctx.globalAlpha = 0.1;
      for (let x = 0; x < rect.width; x += 20) {
        for (let y = 0; y < rect.height; y += 20) {
          const flowX = 0.5 + Math.sin(x * 0.01 + Date.now() * 0.001) * 0.3;
          const flowY = Math.sin(y * 0.02 + Date.now() * 0.002) * 0.2;
          
          ctx.strokeStyle = '#336688';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + flowX * 15, y + flowY * 15);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Draw fluid particles with flow effects
      particles.forEach(particle => {
        ctx.save();
        
        // Pressure-based transparency and size
        const pressureAlpha = Math.max(0.3, 1 - particle.pressure * 0.5);
        const pressureSize = particle.size * (1 + particle.pressure * 0.3);
        
        ctx.globalAlpha = pressureAlpha;
        
        // Velocity-based trail
        const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
        if (speed > 0.5) {
          const trailLength = speed * 10;
          const gradient = ctx.createLinearGradient(
            particle.x, particle.y,
            particle.x - particle.vx * trailLength, particle.y - particle.vy * trailLength
          );
          gradient.addColorStop(0, particle.color + '80');
          gradient.addColorStop(1, particle.color + '00');
          
          ctx.strokeStyle = gradient;
          ctx.lineWidth = pressureSize;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(particle.x - particle.vx * trailLength, particle.y - particle.vy * trailLength);
          ctx.stroke();
        }

        // Main particle with glow
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, pressureSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Draw department inlet labels
      const departments = Object.keys(departmentColors);
      departments.forEach((dept, index) => {
        const y = (rect.height / departments.length) * (index + 0.5);
        const color = departmentColors[dept as keyof typeof departmentColors];
        
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(dept, 5, y - 25);
        
        // Inlet pipe
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, y - 15);
        ctx.lineTo(20, y - 15);
        ctx.lineTo(20, y + 15);
        ctx.lineTo(0, y + 15);
        ctx.stroke();
        
        ctx.restore();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [particles]);

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
      
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 text-white text-xs space-y-2">
        <div className="font-semibold text-accent">Fluid Dynamics</div>
        <div className="text-xs text-muted-foreground">
          <div>• Departments flow from left</div>
          <div>• Pressure shows conflicts</div>
          <div>• Turbulence at mixing zones</div>
        </div>
      </div>
    </div>
  );
};