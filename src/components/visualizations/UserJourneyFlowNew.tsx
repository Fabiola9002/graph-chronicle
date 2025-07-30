import { DatasetAccess } from "../DataJourneyDashboard";
import { useMemo, useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, ChevronUp, ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface UserJourneyFlowProps {
  data: DatasetAccess[];
  perspective?: 'user-journey' | 'dataset-journey';
}

// Custom Node Components
const UserNode = ({ data }: { data: any }) => (
  <div className="bg-secondary rounded-full w-12 h-12 flex items-center justify-center text-secondary-foreground text-xs font-medium shadow-lg border-2 border-secondary/20">
    {data.label.substring(0, 2).toUpperCase()}
  </div>
);

const AccessNode = ({ data }: { data: any }) => (
  <div className={`rounded-full w-8 h-8 flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 ${
    data.type === 'read' 
      ? 'bg-chart-2 border-chart-2/20' 
      : 'bg-chart-1 border-chart-1/20'
  }`}>
    {data.type === 'read' ? 'R' : 'M'}{data.count > 1 ? data.count : ''}
  </div>
);

const nodeTypes: NodeTypes = {
  user: UserNode,
  access: AccessNode,
};

export const UserJourneyFlowNew = ({ data, perspective = 'user-journey' }: UserJourneyFlowProps) => {
  const [currentHour, setCurrentHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [scrollOffset, setScrollOffset] = useState(0);
  
  const maxNodesVisible = 7;

  // Get unique datasets for the left side table
  const uniqueDatasets = useMemo(() => {
    const datasetMap = new Map<string, { 
      name: string; 
      users: Set<string>; 
      accesses: DatasetAccess[] 
    }>();
    
    data.forEach(access => {
      if (!datasetMap.has(access.datasetName)) {
        datasetMap.set(access.datasetName, {
          name: access.datasetName,
          users: new Set(),
          accesses: []
        });
      }
      const dataset = datasetMap.get(access.datasetName)!;
      dataset.users.add(access.userName);
      dataset.accesses.push(access);
    });
    
    return Array.from(datasetMap.values());
  }, [data]);

  // Auto-select first few datasets for initial visibility
  useEffect(() => {
    if (uniqueDatasets.length > 0 && selectedEntities.size === 0) {
      const datasetsToSelect = uniqueDatasets.slice(0, Math.min(3, uniqueDatasets.length));
      setSelectedEntities(new Set(datasetsToSelect.map(e => e.name)));
    }
  }, [uniqueDatasets, selectedEntities.size]);

  // Generate time buckets based on actual data timeline
  const timeBuckets = useMemo(() => {
    const buckets = [];
    
    if (data.length === 0) return buckets;
    
    // Get min and max timestamps from data
    const timestamps = data.map(d => d.timestamp.getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const timeRange = maxTime - minTime;
    
    // Create 3 time buckets based on current time slider position
    const bucketDuration = timeRange / 3;
    const startOffset = (currentHour / 23) * timeRange;
    
    for (let i = 0; i < 3; i++) {
      const bucketStart = new Date(minTime + startOffset + (i * bucketDuration));
      const bucketEnd = new Date(minTime + startOffset + ((i + 1) * bucketDuration));
      
      const relevantAccesses = data.filter(access => {
        if (selectedEntities.size === 0) return false;
        
        const accessTime = new Date(access.timestamp);
        const isInTimeRange = accessTime >= bucketStart && accessTime < bucketEnd;
        
        const isSelectedEntity = perspective === 'user-journey' 
          ? selectedEntities.has(access.userName)
          : selectedEntities.has(access.datasetName);
        
        return isInTimeRange && isSelectedEntity;
      });
      
      buckets.push({
        id: i,
        label: `Period ${i + 1}`,
        accesses: relevantAccesses
      });
    }
    
    return buckets;
  }, [data, currentHour, selectedEntities, perspective]);

  // Get users who access selected datasets
  const activeUsers = useMemo(() => {
    const userSet = new Set<string>();
    data.forEach(access => {
      if (selectedEntities.has(access.datasetName)) {
        userSet.add(access.userName);
      }
    });
    return Array.from(userSet);
  }, [data, selectedEntities]);

  // Generate nodes and edges for React Flow
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // User nodes (left side)
    activeUsers.forEach((user, userIndex) => {
      nodes.push({
        id: `user-${user}`,
        type: 'user',
        position: { x: 50, y: 100 + userIndex * 80 },
        data: { label: user },
      });
    });

    // Access nodes and edges for each time bucket
    timeBuckets.forEach((bucket, bucketIndex) => {
      activeUsers.forEach((user, userIndex) => {
        const userAccesses = bucket.accesses.filter(a => a.userName === user);
        
        if (userAccesses.length > 0) {
          const readAccesses = userAccesses.filter(a => a.accessType.toLowerCase().includes('read'));
          const modifyAccesses = userAccesses.filter(a => !a.accessType.toLowerCase().includes('read'));
          
          let nodeOffset = 0;
          
          // Read access node
          if (readAccesses.length > 0) {
            const accessNodeId = `access-${user}-${bucketIndex}-read`;
            nodes.push({
              id: accessNodeId,
              type: 'access',
              position: { 
                x: 300 + bucketIndex * 150, 
                y: 100 + userIndex * 80 + nodeOffset 
              },
              data: { 
                type: 'read', 
                count: readAccesses.length,
                user,
                bucket: bucketIndex
              },
            });
            
            // Edge from user to read access
            edges.push({
              id: `edge-${user}-${bucketIndex}-read`,
              source: `user-${user}`,
              target: accessNodeId,
              type: 'smoothstep',
              style: { stroke: '#10b981', strokeWidth: 2 },
              animated: false,
            });
            
            nodeOffset += 30;
          }
          
          // Modify access node
          if (modifyAccesses.length > 0) {
            const accessNodeId = `access-${user}-${bucketIndex}-modify`;
            nodes.push({
              id: accessNodeId,
              type: 'access',
              position: { 
                x: 300 + bucketIndex * 150, 
                y: 100 + userIndex * 80 + nodeOffset 
              },
              data: { 
                type: 'modify', 
                count: modifyAccesses.length,
                user,
                bucket: bucketIndex
              },
            });
            
            // Edge from user to modify access
            edges.push({
              id: `edge-${user}-${bucketIndex}-modify`,
              source: `user-${user}`,
              target: accessNodeId,
              type: 'smoothstep',
              style: { stroke: '#ef4444', strokeWidth: 2 },
              animated: false,
            });
          }
        }
      });
    });

    return { nodes, edges };
  }, [activeUsers, timeBuckets]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges);

  // Update nodes and edges when data changes
  useEffect(() => {
    setFlowNodes(nodes);
    setFlowEdges(edges);
  }, [nodes, edges, setFlowNodes, setFlowEdges]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentHour(prev => (prev + 1) % 24);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentHour(0);
    setIsPlaying(false);
  };

  const toggleEntitySelection = (entityName: string) => {
    setSelectedEntities(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(entityName)) {
        newSelected.delete(entityName);
      } else {
        newSelected.add(entityName);
      }
      return newSelected;
    });
  };

  const handleScrollUp = () => {
    setScrollOffset(prev => Math.max(0, prev - 1));
  };

  const handleScrollDown = () => {
    setScrollOffset(prev => Math.min(uniqueDatasets.length - maxNodesVisible, prev + 1));
  };

  const visibleDatasets = uniqueDatasets.slice(scrollOffset, scrollOffset + maxNodesVisible);
  const canScrollUp = scrollOffset > 0;
  const canScrollDown = scrollOffset < uniqueDatasets.length - maxNodesVisible;

  return (
    <div className="w-full h-full p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {perspective === 'user-journey' ? 'User Journey Flow' : 'Dataset Journey Flow'}
        </h3>
        <div className="flex gap-2">
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
      </div>

      <div className="mb-4">
        <div className="text-xs text-muted-foreground mb-2">Time Control</div>
        <Slider
          value={[currentHour]}
          onValueChange={([value]) => setCurrentHour(value)}
          max={23}
          step={1}
          className="w-full max-w-md"
        />
        <div className="text-xs text-muted-foreground mt-1">
          Current Hour: {currentHour.toString().padStart(2, '0')}:00
        </div>
      </div>
      
      <div className="flex gap-6">
        {/* Dataset Selection Table */}
        <div className="w-80 flex-shrink-0">
          <div className="border border-border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Select</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dataset FQN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleDatasets.map((dataset) => {
                  const isSelected = selectedEntities.has(dataset.name);
                  const readCount = dataset.accesses.filter(a => 
                    a.accessType.toLowerCase().includes('read')
                  ).length;
                  const modifyCount = dataset.accesses.filter(a => 
                    !a.accessType.toLowerCase().includes('read')
                  ).length;
                  
                  return (
                    <TableRow key={dataset.name} className="h-20">
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleEntitySelection(dataset.name)}
                        />
                      </TableCell>
                      <TableCell className="text-xs">
                        Dataset
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        <div className="max-w-32 truncate" title={dataset.name}>
                          {dataset.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {readCount}R / {modifyCount}M
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          {/* Scroll controls for table */}
          {uniqueDatasets.length > maxNodesVisible && (
            <div className="flex justify-center gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleScrollUp}
                disabled={!canScrollUp}
                className="w-8 h-8 p-0"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleScrollDown}
                disabled={!canScrollDown}
                className="w-8 h-8 p-0"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Flow Visualization */}
        <div className="flex-1 h-[600px] border border-border rounded-lg bg-card relative">
          {/* Period Labels */}
          <div className="absolute top-4 left-0 right-0 flex justify-center gap-32 z-10 pointer-events-none">
            {timeBuckets.map((bucket, index) => (
              <div key={bucket.id} className="text-center font-bold text-sm bg-gradient-primary bg-clip-text text-transparent">
                {bucket.label}
              </div>
            ))}
          </div>
          
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            style={{ backgroundColor: "transparent" }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
          >
            <Background />
          </ReactFlow>
        </div>
      </div>
      
      {selectedEntities.size === 0 && (
        <div className="text-center text-muted-foreground text-sm py-8">
          Select datasets from the table to see user access patterns and flows across time periods
        </div>
      )}
      
      {selectedEntities.size > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2">
            Selected Datasets ({selectedEntities.size})
          </div>
          <div className="flex flex-wrap gap-1">
            {Array.from(selectedEntities).map(entity => (
              <Badge key={entity} variant="outline" className="text-xs">
                {entity}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="flex gap-4 text-sm bg-background/90 p-3 rounded-lg border mt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-chart-2"></div>
          <span>Read Operations</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-chart-1"></div>
          <span>Modify Operations</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-px bg-green-500"></div>
          <span>Read Flow</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-px bg-red-500"></div>
          <span>Modify Flow</span>
        </div>
      </div>
    </div>
  );
};