import { useEffect, useRef, useState } from 'react';
import { DatasetAccess } from '../DataJourneyDashboard';

interface Neuron {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'user' | 'dataset';
  label: string;
  color: string;
  charge: number;
  firing: boolean;
  lastFired: number;
  connections: string[];
  activity: number;
  pulseIntensity: number;
}

interface Synapse {
  id: string;
  source: string;
  target: string;
  strength: number;
  pulse: number;
  pulsing: boolean;
  lastPulse: number;
  color: string;
}

interface NeuralNetworkBrainProps {
  data: DatasetAccess[];
}

export const NeuralNetworkBrain = ({ data }: NeuralNetworkBrainProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [neurons, setNeurons] = useState<Neuron[]>([]);
  const [synapses, setSynapses] = useState<Synapse[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });

  const departmentColors = {
    Engineering: '#FF4444',
    Analytics: '#44FFAA', 
    Sales: '#4488FF',
    Marketing: '#FF44AA',
    Operations: '#FFAA44'
  };

  const datasetTypeColors = {
    table: '#9966FF',
    file: '#66FFAA', 
    api: '#FFAA66',
    stream: '#FF6699'
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

    // Create neurons from data
    const userNeurons = new Map<string, Neuron>();
    const datasetNeurons = new Map<string, Neuron>();
    const connections = new Map<string, Set<string>>();
    const accessCounts = new Map<string, number>();

    data.forEach(access => {
      const userKey = `${access.userId}-${access.department}`;
      const datasetKey = `${access.datasetId}-${access.datasetType}`;
      
      accessCounts.set(userKey, (accessCounts.get(userKey) || 0) + 1);
      accessCounts.set(datasetKey, (accessCounts.get(datasetKey) || 0) + 1);

      // Track connections
      if (!connections.has(userKey)) connections.set(userKey, new Set());
      if (!connections.has(datasetKey)) connections.set(datasetKey, new Set());
      connections.get(userKey)?.add(datasetKey);
      connections.get(datasetKey)?.add(userKey);

      // Create user neurons with organic brain-like positioning
      if (!userNeurons.has(userKey)) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 100 + Math.random() * 150;
        const centerX = rect.width * 0.3;
        const centerY = rect.height * 0.5;
        
        userNeurons.set(userKey, {
          id: userKey,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius * 0.7,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: 8,
          type: 'user',
          label: access.userName,
          color: departmentColors[access.department as keyof typeof departmentColors] || '#888888',
          charge: 0,
          firing: false,
          lastFired: 0,
          connections: [],
          activity: 0,
          pulseIntensity: 0
        });
      }

      // Create dataset neurons positioned on the right side
      if (!datasetNeurons.has(datasetKey)) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 80 + Math.random() * 120;
        const centerX = rect.width * 0.7;
        const centerY = rect.height * 0.5;
        
        datasetNeurons.set(datasetKey, {
          id: datasetKey,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius * 0.8,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: 12,
          type: 'dataset',
          label: access.datasetName,
          color: datasetTypeColors[access.datasetType] || '#BBBBBB',
          charge: 0,
          firing: false,
          lastFired: 0,
          connections: [],
          activity: 0,
          pulseIntensity: 0
        });
      }
    });

    // Update neuron sizes based on activity and set connections
    const allNeurons = [...Array.from(userNeurons.values()), ...Array.from(datasetNeurons.values())];
    allNeurons.forEach(neuron => {
      const count = accessCounts.get(neuron.id) || 1;
      const connectionList = Array.from(connections.get(neuron.id) || []);
      
      if (neuron.type === 'user') {
        neuron.radius = Math.max(6, Math.min(16, 8 + count * 0.4));
      } else {
        neuron.radius = Math.max(10, Math.min(20, 12 + count * 0.5));
      }
      
      neuron.connections = connectionList;
      neuron.activity = count;
    });

    // Create synapses
    const synapseMap = new Map<string, Synapse>();
    data.forEach((access, index) => {
      const userKey = `${access.userId}-${access.department}`;
      const datasetKey = `${access.datasetId}-${access.datasetType}`;
      const synapseId = `${userKey}->${datasetKey}`;
      
      if (!synapseMap.has(synapseId)) {
        synapseMap.set(synapseId, {
          id: synapseId,
          source: userKey,
          target: datasetKey,
          strength: 1,
          pulse: 0,
          pulsing: false,
          lastPulse: Math.random() * 3000,
          color: userNeurons.get(userKey)?.color || '#888888'
        });
      } else {
        const synapse = synapseMap.get(synapseId)!;
        synapse.strength += 1;
      }
    });

    setNeurons(allNeurons);
    setSynapses(Array.from(synapseMap.values()));
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
      const currentTime = Date.now();
      
      // Create brain-like background
      const gradient = ctx.createRadialGradient(
        rect.width / 2, rect.height / 2, 0,
        rect.width / 2, rect.height / 2, rect.width / 2
      );
      gradient.addColorStop(0, 'rgba(20, 20, 40, 1)');
      gradient.addColorStop(0.5, 'rgba(10, 10, 30, 1)');
      gradient.addColorStop(1, 'rgba(5, 5, 20, 1)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Add subtle brain texture
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * rect.width;
        const y = Math.random() * rect.height;
        const alpha = Math.random() * 0.1;
        ctx.fillStyle = `rgba(100, 100, 150, ${alpha})`;
        ctx.fillRect(x, y, 1, 1);
      }

      // Update neurons with neural network physics
      setNeurons(prevNeurons => {
        return prevNeurons.map(neuron => {
          // Neural charge decay
          neuron.charge *= 0.95;
          neuron.pulseIntensity *= 0.9;

          // Random neural firing
          if (Math.random() < 0.002 * neuron.activity) {
            neuron.firing = true;
            neuron.charge = 1;
            neuron.pulseIntensity = 1;
            neuron.lastFired = currentTime;
          }

          // Stop firing after brief period
          if (neuron.firing && currentTime - neuron.lastFired > 300) {
            neuron.firing = false;
          }

          // Organic movement with neural-like behavior
          let fx = 0, fy = 0;

          // Attraction to ideal positions
          const targetX = neuron.type === 'user' ? rect.width * 0.3 : rect.width * 0.7;
          const targetY = rect.height * 0.5;
          const dx = targetX - neuron.x;
          const dy = targetY - neuron.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            fx += (dx / distance) * 0.02;
            fy += (dy / distance) * 0.02;
          }

          // Inter-neuron forces
          prevNeurons.forEach(other => {
            if (other.id === neuron.id) return;
            
            const odx = other.x - neuron.x;
            const ody = other.y - neuron.y;
            const odist = Math.sqrt(odx * odx + ody * ody);
            
            if (odist > 0 && odist < 100) {
              // Repulsion to prevent clustering
              const repulsion = (100 - odist) / 5000;
              fx -= (odx / odist) * repulsion;
              fy -= (ody / odist) * repulsion;
            }
          });

          // Mouse interaction
          const mouseDx = mouseRef.current.x - neuron.x;
          const mouseDy = mouseRef.current.y - neuron.y;
          const mouseDistance = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);
          if (mouseDistance < 80) {
            const mouseForce = (80 - mouseDistance) / 1000;
            fx += (mouseDx / mouseDistance) * mouseForce;
            fy += (mouseDy / mouseDistance) * mouseForce;
            
            // Trigger firing on proximity
            if (mouseDistance < 40 && Math.random() < 0.1) {
              neuron.firing = true;
              neuron.charge = 1;
              neuron.pulseIntensity = 1;
              neuron.lastFired = currentTime;
            }
          }

          // Update velocity and position
          neuron.vx = (neuron.vx + fx) * 0.95;
          neuron.vy = (neuron.vy + fy) * 0.95;
          
          neuron.x += neuron.vx;
          neuron.y += neuron.vy;

          // Boundary constraints
          const margin = neuron.radius;
          if (neuron.x < margin) { neuron.x = margin; neuron.vx *= -0.5; }
          if (neuron.x > rect.width - margin) { neuron.x = rect.width - margin; neuron.vx *= -0.5; }
          if (neuron.y < margin) { neuron.y = margin; neuron.vy *= -0.5; }
          if (neuron.y > rect.height - margin) { neuron.y = rect.height - margin; neuron.vy *= -0.5; }

          return neuron;
        });
      });

      // Update and draw synapses
      setSynapses(prevSynapses => {
        return prevSynapses.map(synapse => {
          const sourceNeuron = neurons.find(n => n.id === synapse.source);
          const targetNeuron = neurons.find(n => n.id === synapse.target);
          
          if (!sourceNeuron || !targetNeuron) return synapse;

          // Trigger pulse if source is firing
          if (sourceNeuron.firing && !synapse.pulsing && currentTime - synapse.lastPulse > 1000) {
            synapse.pulsing = true;
            synapse.pulse = 0;
            synapse.lastPulse = currentTime;
          }

          // Update pulse
          if (synapse.pulsing) {
            synapse.pulse += 0.05;
            if (synapse.pulse >= 1) {
              synapse.pulsing = false;
              synapse.pulse = 0;
              // Trigger target neuron
              targetNeuron.firing = true;
              targetNeuron.charge = 0.8;
              targetNeuron.pulseIntensity = 0.8;
              targetNeuron.lastFired = currentTime;
            }
          }

          return synapse;
        });
      });

      // Draw synapses
      synapses.forEach(synapse => {
        const sourceNeuron = neurons.find(n => n.id === synapse.source);
        const targetNeuron = neurons.find(n => n.id === synapse.target);
        
        if (!sourceNeuron || !targetNeuron) return;

        ctx.save();
        
        // Base synapse connection
        const baseAlpha = Math.min(synapse.strength * 0.1, 0.4);
        ctx.strokeStyle = `${synapse.color}${Math.floor(baseAlpha * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = Math.min(synapse.strength * 0.5, 3);
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(sourceNeuron.x, sourceNeuron.y);
        ctx.lineTo(targetNeuron.x, targetNeuron.y);
        ctx.stroke();

        // Pulse effect
        if (synapse.pulsing) {
          const pulseX = sourceNeuron.x + (targetNeuron.x - sourceNeuron.x) * synapse.pulse;
          const pulseY = sourceNeuron.y + (targetNeuron.y - sourceNeuron.y) * synapse.pulse;
          
          ctx.shadowColor = synapse.color;
          ctx.shadowBlur = 15;
          ctx.fillStyle = synapse.color;
          ctx.globalAlpha = 1 - synapse.pulse;
          
          ctx.beginPath();
          ctx.arc(pulseX, pulseY, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // Draw neurons
      neurons.forEach(neuron => {
        ctx.save();
        
        // Neural glow effect
        if (neuron.firing || neuron.pulseIntensity > 0.1) {
          const glowRadius = neuron.radius + 10 * neuron.pulseIntensity;
          const gradient = ctx.createRadialGradient(
            neuron.x, neuron.y, neuron.radius,
            neuron.x, neuron.y, glowRadius
          );
          gradient.addColorStop(0, `${neuron.color}80`);
          gradient.addColorStop(1, `${neuron.color}00`);
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(neuron.x, neuron.y, glowRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Main neuron body
        const intensity = neuron.firing ? 1 : 0.3 + neuron.charge * 0.7;
        ctx.globalAlpha = intensity;
        
        if (neuron.type === 'dataset') {
          // Dataset neurons as hexagons
          ctx.fillStyle = neuron.color;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const x = neuron.x + Math.cos(angle) * neuron.radius;
            const y = neuron.y + Math.sin(angle) * neuron.radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          // User neurons as circles with neural texture
          ctx.fillStyle = neuron.color;
          ctx.beginPath();
          ctx.arc(neuron.x, neuron.y, neuron.radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Inner neural pattern
          if (neuron.firing) {
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(neuron.x, neuron.y, neuron.radius * 0.6, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // Label on hover
        const mouseDx = mouseRef.current.x - neuron.x;
        const mouseDy = mouseRef.current.y - neuron.y;
        const mouseDistance = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);
        
        if (mouseDistance < neuron.radius + 20) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '11px Arial';
          ctx.textAlign = 'center';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 3;
          ctx.fillText(neuron.label, neuron.x, neuron.y - neuron.radius - 15);
        }

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
  }, [neurons, synapses, data]);

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
      />
      
      {/* Neural Legend */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 text-white text-xs space-y-2">
        <div className="font-semibold text-accent">Neural Network</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF4444]"></div>
          <span>Engineering</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#44FFAA]"></div>
          <span>Analytics</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-2 bg-[#9966FF] transform rotate-45"></div>
          <span>Datasets</span>
        </div>
        <div className="text-xs text-muted-foreground mt-2 border-t border-white/20 pt-2">
          <div>• Hover to trigger firing</div>
          <div>• Pulses show data flow</div>
          <div>• Size = activity level</div>
        </div>
      </div>
    </div>
  );
};