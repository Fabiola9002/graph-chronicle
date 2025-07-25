import { useEffect, useRef, useState } from 'react';
import { DatasetAccess } from '../DataJourneyDashboard';

interface Node {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'user' | 'dataset';
  label: string;
  color: string;
  mass: number;
  glowIntensity: number;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  sourceId: string;
  targetId: string;
  color: string;
}

interface ParticleGalaxyFlowProps {
  data: DatasetAccess[];
}

export const ParticleGalaxyFlow = ({ data }: ParticleGalaxyFlowProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });

  const departmentColors = {
    Engineering: '#FF6B6B',
    Analytics: '#4ECDC4', 
    Sales: '#45B7D1',
    Marketing: '#96CEB4',
    Operations: '#FFEAA7'
  };

  const datasetTypeColors = {
    table: '#DDA0DD',
    file: '#98D8C8', 
    api: '#F7DC6F',
    stream: '#BB8FCE'
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

    // Create nodes from data
    const userNodes = new Map<string, Node>();
    const datasetNodes = new Map<string, Node>();
    const accessCounts = new Map<string, number>();

    data.forEach(access => {
      const userKey = `${access.userId}-${access.department}`;
      const datasetKey = `${access.datasetId}-${access.datasetType}`;
      
      accessCounts.set(userKey, (accessCounts.get(userKey) || 0) + 1);
      accessCounts.set(datasetKey, (accessCounts.get(datasetKey) || 0) + 1);

      if (!userNodes.has(userKey)) {
        userNodes.set(userKey, {
          id: userKey,
          x: Math.random() * (rect.width - 100) + 50,
          y: Math.random() * (rect.height - 100) + 50,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          radius: 8,
          type: 'user',
          label: access.userName,
          color: departmentColors[access.department as keyof typeof departmentColors] || '#95A5A6',
          mass: 1,
          glowIntensity: 0
        });
      }

      if (!datasetNodes.has(datasetKey)) {
        datasetNodes.set(datasetKey, {
          id: datasetKey,
          x: Math.random() * (rect.width - 100) + 50,
          y: Math.random() * (rect.height - 100) + 50,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: 15,
          type: 'dataset',
          label: access.datasetName,
          color: datasetTypeColors[access.datasetType] || '#BDC3C7',
          mass: 3,
          glowIntensity: 0
        });
      }
    });

    // Update node sizes based on access frequency
    userNodes.forEach((node, key) => {
      const count = accessCounts.get(key) || 1;
      node.radius = Math.max(6, Math.min(20, 8 + count * 0.5));
      node.mass = count * 0.1 + 1;
    });

    datasetNodes.forEach((node, key) => {
      const count = accessCounts.get(key) || 1;
      node.radius = Math.max(12, Math.min(30, 15 + count * 0.8));
      node.mass = count * 0.2 + 3;
    });

    const allNodes = [...Array.from(userNodes.values()), ...Array.from(datasetNodes.values())];
    setNodes(allNodes);

    // Create initial particles
    const initialParticles: Particle[] = [];
    data.slice(0, 50).forEach((access, i) => {
      const userKey = `${access.userId}-${access.department}`;
      const datasetKey = `${access.datasetId}-${access.datasetType}`;
      const userNode = userNodes.get(userKey);
      const datasetNode = datasetNodes.get(datasetKey);

      if (userNode && datasetNode) {
        initialParticles.push({
          id: `particle-${i}`,
          x: userNode.x,
          y: userNode.y,
          vx: (datasetNode.x - userNode.x) * 0.02,
          vy: (datasetNode.y - userNode.y) * 0.02,
          life: 100,
          maxLife: 100,
          sourceId: userNode.id,
          targetId: datasetNode.id,
          color: userNode.color
        });
      }
    });

    setParticles(initialParticles);
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    return () => canvas.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      
      // Clear canvas with space-like background
      ctx.fillStyle = 'rgba(8, 8, 20, 0.1)';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Add stars background
      for (let i = 0; i < 100; i++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
        ctx.fillRect(
          Math.random() * rect.width,
          Math.random() * rect.height,
          1, 1
        );
      }

      // Update and draw nodes with physics
      setNodes(prevNodes => {
        return prevNodes.map(node => {
          let fx = 0, fy = 0;

          // Gravitational forces between nodes
          prevNodes.forEach(other => {
            if (other.id === node.id) return;
            
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
              const force = (node.mass * other.mass) / (distance * distance * 1000);
              fx += (dx / distance) * force;
              fy += (dy / distance) * force;
            }
          });

          // Mouse attraction
          const mouseDx = mouseRef.current.x - node.x;
          const mouseDy = mouseRef.current.y - node.y;
          const mouseDistance = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);
          if (mouseDistance < 100) {
            const mouseForce = (100 - mouseDistance) / 2000;
            fx += (mouseDx / mouseDistance) * mouseForce;
            fy += (mouseDy / mouseDistance) * mouseForce;
          }

          // Update velocity and position
          node.vx = (node.vx + fx) * 0.99;
          node.vy = (node.vy + fy) * 0.99;
          
          node.x += node.vx;
          node.y += node.vy;

          // Boundary collision
          if (node.x < node.radius) { node.x = node.radius; node.vx *= -0.8; }
          if (node.x > rect.width - node.radius) { node.x = rect.width - node.radius; node.vx *= -0.8; }
          if (node.y < node.radius) { node.y = node.radius; node.vy *= -0.8; }
          if (node.y > rect.height - node.radius) { node.y = rect.height - node.radius; node.vy *= -0.8; }

          return node;
        });
      });

      // Update and draw particles
      setParticles(prevParticles => {
        return prevParticles.filter(particle => {
          particle.life--;
          
          // Find target node
          const targetNode = nodes.find(n => n.id === particle.targetId);
          if (targetNode) {
            const dx = targetNode.x - particle.x;
            const dy = targetNode.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
              particle.vx += (dx / distance) * 0.1;
              particle.vy += (dy / distance) * 0.1;
              particle.x += particle.vx;
              particle.y += particle.vy;
            }
          }

          // Draw particle with trail
          const alpha = particle.life / particle.maxLife;
          ctx.save();
          ctx.globalAlpha = alpha;
          
          // Glow effect
          ctx.shadowColor = particle.color;
          ctx.shadowBlur = 10;
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();

          return particle.life > 0;
        });
      });

      // Draw nodes
      nodes.forEach(node => {
        ctx.save();
        
        // Glow effect for datasets
        if (node.type === 'dataset') {
          ctx.shadowColor = node.color;
          ctx.shadowBlur = 20;
          ctx.fillStyle = node.color;
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Main node
        ctx.shadowBlur = node.type === 'user' ? 5 : 10;
        ctx.fillStyle = node.color;
        ctx.globalAlpha = node.type === 'user' ? 0.9 : 0.7;
        
        if (node.type === 'dataset') {
          // Draw dataset as diamond
          ctx.beginPath();
          ctx.moveTo(node.x, node.y - node.radius);
          ctx.lineTo(node.x + node.radius, node.y);
          ctx.lineTo(node.x, node.y + node.radius);
          ctx.lineTo(node.x - node.radius, node.y);
          ctx.closePath();
          ctx.fill();
        } else {
          // Draw user as circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Label on hover
        const mouseDx = mouseRef.current.x - node.x;
        const mouseDy = mouseRef.current.y - node.y;
        const mouseDistance = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);
        
        if (mouseDistance < node.radius + 20) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(node.label, node.x, node.y - node.radius - 10);
        }

        ctx.restore();
      });

      // Periodically spawn new particles
      if (Math.random() < 0.1 && data.length > 0) {
        const access = data[Math.floor(Math.random() * data.length)];
        const userKey = `${access.userId}-${access.department}`;
        const datasetKey = `${access.datasetId}-${access.datasetType}`;
        const userNode = nodes.find(n => n.id === userKey);
        const datasetNode = nodes.find(n => n.id === datasetKey);

        if (userNode && datasetNode) {
          setParticles(prev => [...prev, {
            id: `particle-${Date.now()}`,
            x: userNode.x,
            y: userNode.y,
            vx: (datasetNode.x - userNode.x) * 0.02,
            vy: (datasetNode.y - userNode.y) * 0.02,
            life: 100,
            maxLife: 100,
            sourceId: userNode.id,
            targetId: datasetNode.id,
            color: userNode.color
          }]);
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes, data]);

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        style={{ background: 'radial-gradient(circle, #1a1a2e 0%, #16213e 50%, #0f0f0f 100%)' }}
      />
      
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-xs space-y-2">
        <div className="font-semibold text-accent">Galaxy Map</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF6B6B]"></div>
          <span>Engineering</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#4ECDC4]"></div>
          <span>Analytics</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#DDA0DD] transform rotate-45"></div>
          <span>Datasets</span>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Hover over nodes for details
        </div>
      </div>
    </div>
  );
};