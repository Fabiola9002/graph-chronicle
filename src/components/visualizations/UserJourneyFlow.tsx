import { DatasetAccess } from "../DataJourneyDashboard";
import { useMemo, useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface UserJourneyFlowProps {
  data: DatasetAccess[];
}

interface TimeBucket {
  startTime: number;
  endTime: number;
  accesses: DatasetAccess[];
}

interface FlowNode {
  id: string;
  type: 'user' | 'dataset' | 'operation';
  label: string;
  x: number;
  y: number;
  bucket: number;
  accessType?: string;
  datasetType?: string;
}

interface FlowEdge {
  source: string;
  target: string;
  type: 'read' | 'modify';
  strength: number;
}

export const UserJourneyFlow = ({ data }: UserJourneyFlowProps) => {
  const [currentTimeWindow, setCurrentTimeWindow] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const bucketData = useMemo(() => {
    if (data.length === 0) return [];
    
    const sortedData = [...data].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const startTime = new Date(sortedData[0].timestamp).getTime();
    const endTime = new Date(sortedData[sortedData.length - 1].timestamp).getTime();
    const bucketCount = 10;
    const bucketDuration = (endTime - startTime) / bucketCount;
    
    const buckets: TimeBucket[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = startTime + (i * bucketDuration);
      const bucketEnd = bucketStart + bucketDuration;
      
      const bucketAccesses = sortedData.filter(access => {
        const accessTime = new Date(access.timestamp).getTime();
        return accessTime >= bucketStart && accessTime < bucketEnd;
      });
      
      buckets.push({
        startTime: bucketStart,
        endTime: bucketEnd,
        accesses: bucketAccesses
      });
    }
    
    return buckets;
  }, [data]);

  const visibleBuckets = useMemo(() => {
    const windowSize = 3;
    const startBucket = Math.max(0, currentTimeWindow - 1);
    const endBucket = Math.min(bucketData.length, currentTimeWindow + windowSize - 1);
    return bucketData.slice(startBucket, endBucket);
  }, [bucketData, currentTimeWindow]);

  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, FlowNode>();
    const edgeMap = new Map<string, FlowEdge>();
    
    const bucketWidth = 200;
    const bucketHeight = 400;
    
    visibleBuckets.forEach((bucket, bucketIndex) => {
      const users = new Set<string>();
      const datasets = new Set<string>();
      
      bucket.accesses.forEach(access => {
        if (!selectedUser || access.userName === selectedUser) {
          users.add(access.userName);
          datasets.add(access.datasetName);
        }
      });
      
      // Create user nodes
      Array.from(users).forEach((user, userIndex) => {
        const nodeId = `user-${bucketIndex}-${user}`;
        nodeMap.set(nodeId, {
          id: nodeId,
          type: 'user',
          label: user,
          x: bucketIndex * bucketWidth + 50,
          y: 50 + (userIndex * 40),
          bucket: bucketIndex
        });
      });
      
      // Create dataset nodes
      Array.from(datasets).forEach((dataset, datasetIndex) => {
        const nodeId = `dataset-${bucketIndex}-${dataset}`;
        nodeMap.set(nodeId, {
          id: nodeId,
          type: 'dataset',
          label: dataset,
          x: bucketIndex * bucketWidth + 50,
          y: 200 + (datasetIndex * 40),
          bucket: bucketIndex
        });
      });
      
      // Create edges between users and datasets
      bucket.accesses.forEach(access => {
        if (!selectedUser || access.userName === selectedUser) {
          const userNodeId = `user-${bucketIndex}-${access.userName}`;
          const datasetNodeId = `dataset-${bucketIndex}-${access.datasetName}`;
          const edgeId = `${userNodeId}-${datasetNodeId}`;
          
          const existingEdge = edgeMap.get(edgeId);
          if (existingEdge) {
            existingEdge.strength += 1;
          } else {
            edgeMap.set(edgeId, {
              source: userNodeId,
              target: datasetNodeId,
              type: access.accessType.toLowerCase().includes('read') ? 'read' : 'modify',
              strength: 1
            });
          }
        }
      });
    });
    
    return {
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values())
    };
  }, [visibleBuckets, selectedUser]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentTimeWindow(prev => {
        if (prev >= bucketData.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isPlaying, bucketData.length]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentTimeWindow(0);
    setIsPlaying(false);
  };

  const handleTimeChange = (value: number[]) => {
    setCurrentTimeWindow(value[0]);
    setIsPlaying(false);
  };

  const getPathData = (edge: FlowEdge) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return "";
    
    const x1 = sourceNode.x + 60;
    const y1 = sourceNode.y + 15;
    const x2 = targetNode.x + 60;
    const y2 = targetNode.y + 15;
    
    const midY = (y1 + y2) / 2;
    
    return `M ${x1} ${y1} Q ${x1 + 50} ${midY} ${x2} ${y2}`;
  };

  const uniqueUsers = useMemo(() => {
    return Array.from(new Set(data.map(d => d.userName)));
  }, [data]);

  return (
    <div className="w-full h-full flex flex-col p-4">
      {/* Controls */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlayPause}
            className="w-8 h-8 p-0"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="w-8 h-8 p-0"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex-1 px-4">
          <Slider
            value={[currentTimeWindow]}
            onValueChange={handleTimeChange}
            max={Math.max(0, bucketData.length - 1)}
            step={1}
            className="w-full"
          />
        </div>
        
        <Badge variant="outline" className="text-xs">
          Bucket {currentTimeWindow + 1} / {bucketData.length}
        </Badge>
      </div>

      {/* User Filter */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium">Filter by user:</span>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedUser === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedUser(null)}
          >
            All Users
          </Button>
          {uniqueUsers.slice(0, 5).map(user => (
            <Button
              key={user}
              variant={selectedUser === user ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedUser(user)}
            >
              {user}
            </Button>
          ))}
        </div>
      </div>

      {/* Visualization */}
      <div className="flex-1 overflow-auto">
        <svg
          ref={svgRef}
          width="100%"
          height="500"
          className="border border-border rounded-lg bg-card"
        >
          {/* Time bucket columns */}
          {visibleBuckets.map((_, bucketIndex) => (
            <g key={bucketIndex}>
              <line
                x1={bucketIndex * 200 + 25}
                y1={20}
                x2={bucketIndex * 200 + 25}
                y2={480}
                stroke="hsl(var(--border))"
                strokeDasharray="5,5"
                opacity={0.3}
              />
              <text
                x={bucketIndex * 200 + 100}
                y={15}
                textAnchor="middle"
                fontSize="12"
                fill="hsl(var(--muted-foreground))"
              >
                T{currentTimeWindow - 1 + bucketIndex + 1}
              </text>
            </g>
          ))}

          {/* Edges */}
          {edges.map((edge, index) => (
            <path
              key={`${edge.source}-${edge.target}-${index}`}
              d={getPathData(edge)}
              stroke={edge.type === 'read' ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'}
              strokeWidth={Math.min(edge.strength * 2, 8)}
              fill="none"
              opacity={0.7}
              className="transition-all duration-300"
            />
          ))}

          {/* Nodes */}
          {nodes.map(node => (
            <g key={node.id} className="transition-all duration-300">
              <rect
                x={node.x}
                y={node.y}
                width={120}
                height={30}
                rx={4}
                fill={node.type === 'user' ? 'hsl(var(--primary))' : 'hsl(var(--secondary))'}
                opacity={0.8}
              />
              <text
                x={node.x + 60}
                y={node.y + 20}
                textAnchor="middle"
                fontSize="11"
                fill={node.type === 'user' ? 'hsl(var(--primary-foreground))' : 'hsl(var(--secondary-foreground))'}
                className="truncate"
              >
                {node.label.length > 15 ? `${node.label.substring(0, 12)}...` : node.label}
              </text>
            </g>
          ))}

          {/* Legend */}
          <g transform="translate(20, 450)">
            <rect
              x={0}
              y={0}
              width={15}
              height={4}
              fill="hsl(var(--primary))"
            />
            <text x={20} y={8} fontSize="10" fill="hsl(var(--foreground))">Reads</text>
            
            <rect
              x={70}
              y={0}
              width={15}
              height={4}
              fill="hsl(var(--destructive))"
            />
            <text x={90} y={8} fontSize="10" fill="hsl(var(--foreground))">Modifies</text>
          </g>
        </svg>
      </div>

      {/* Stats */}
      <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
        <span>Window: {visibleBuckets.length} buckets</span>
        <span>Nodes: {nodes.length}</span>
        <span>Connections: {edges.length}</span>
      </div>
    </div>
  );
};