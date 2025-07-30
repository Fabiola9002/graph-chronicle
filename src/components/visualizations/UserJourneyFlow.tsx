import { DatasetAccess } from "../DataJourneyDashboard";
import { useMemo, useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, ChevronUp, ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserJourneyFlowProps {
  data: DatasetAccess[];
  perspective?: 'user-journey' | 'dataset-journey';
}

interface TimeBucket {
  hour: number;
  label: string;
  accesses: DatasetAccess[];
}

export const UserJourneyFlow = ({ data, perspective = 'user-journey' }: UserJourneyFlowProps) => {
  const [currentHour, setCurrentHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [scrollOffset, setScrollOffset] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const maxNodesVisible = 7;
  const nodeHeight = 80;

  // Get unique entities for the left side nodes (users or datasets based on perspective)
  const uniqueEntities = useMemo(() => {
    if (perspective === 'user-journey') {
      // For user journey, show datasets in table with users accessing them
      const datasetMap = new Map<string, { 
        name: string; 
        id: string;
        users: Set<string>; 
        accesses: DatasetAccess[] 
      }>();
      
      data.forEach(access => {
        if (!datasetMap.has(access.datasetName)) {
          datasetMap.set(access.datasetName, {
            name: access.datasetName,
            id: access.datasetId,
            users: new Set(),
            accesses: []
          });
        }
        const dataset = datasetMap.get(access.datasetName)!;
        dataset.users.add(access.userName);
        dataset.accesses.push(access);
      });
      
      return Array.from(datasetMap.values());
    } else {
      // Dataset journey perspective - keep original logic
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
    }
  }, [data, perspective]);

  // Auto-select first few entities for initial visibility
  useEffect(() => {
    if (uniqueEntities.length > 0 && selectedEntities.size === 0) {
      const entitiesToSelect = uniqueEntities.slice(0, Math.min(3, uniqueEntities.length));
      setSelectedEntities(new Set(entitiesToSelect.map(e => e.name)));
    }
  }, [uniqueEntities, selectedEntities.size]);

  // Generate time buckets based on current hour
  const timeBuckets = useMemo(() => {
    const buckets: TimeBucket[] = [];
    const now = new Date();
    const baseHour = now.getHours();
    
    for (let i = 0; i < 3; i++) {
      const hour = (baseHour + currentHour + i) % 24;
      const bucketStart = new Date(now);
      bucketStart.setHours(hour, 0, 0, 0);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setHours(hour + 1, 0, 0, 0);
      
      const relevantAccesses = data.filter(access => {
        if (selectedEntities.size === 0) return false;
        
        const accessTime = new Date(access.timestamp);
        const isInTimeRange = accessTime >= bucketStart && accessTime < bucketEnd;
        
        const isSelectedEntity = perspective === 'user-journey' 
          ? selectedEntities.has(access.datasetName)
          : selectedEntities.has(access.datasetName);
        
        return isInTimeRange && isSelectedEntity;
      });
      
      buckets.push({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        accesses: relevantAccesses
      });
    }
    
    return buckets;
  }, [data, currentHour, selectedEntities, perspective]);

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
    setScrollOffset(prev => Math.min(uniqueEntities.length - maxNodesVisible, prev + 1));
  };

  const visibleEntities = uniqueEntities.slice(scrollOffset, scrollOffset + maxNodesVisible);
  const canScrollUp = scrollOffset > 0;
  const canScrollDown = scrollOffset < uniqueEntities.length - maxNodesVisible;

  const entityTypeLabel = perspective === 'user-journey' ? 'Dataset' : 'Dataset';

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

      {/* Controls Row */}
      <div className="mb-6 flex items-center justify-end">
        <div className="flex gap-4 items-end">
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Time Unit</label>
            <Select defaultValue="hours">
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seconds">Seconds</SelectItem>
                <SelectItem value="minutes">Minutes</SelectItem>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="days">Days</SelectItem>
                <SelectItem value="years">Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Count</label>
            <input 
              type="number" 
              min="1"
              className="w-20 h-8 px-2 text-xs border border-border rounded bg-background"
              placeholder="1"
            />
          </div>
        </div>
      </div>
      
      <div className="flex gap-6">
        {/* Dataset Selection */}
        <div className="w-80 flex-shrink-0">
          <div className="mb-3">
            <h4 className="text-sm font-medium">Selected Datasets ({selectedEntities.size})</h4>
          </div>
          <div className="border border-border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Select</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dataset FQN</TableHead>
                </TableRow>
              </TableHeader>
            </Table>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableBody>
                  {uniqueEntities.map((entity) => {
                    const isSelected = selectedEntities.has(entity.name);
                    const readCount = entity.accesses.filter(a => 
                      a.accessType.toLowerCase().includes('read')
                    ).length;
                    const modifyCount = entity.accesses.filter(a => 
                      !a.accessType.toLowerCase().includes('read')
                    ).length;
                    
                    return (
                      <TableRow key={entity.name}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleEntitySelection(entity.name)}
                          />
                        </TableCell>
                        <TableCell className="text-xs">
                          Dataset
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          <div className="max-w-32 truncate" title={entity.name}>
                            {entity.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {perspective === 'user-journey' && 'id' in entity ? String(entity.id) : ''}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {readCount}R / {modifyCount}M
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Visualization */}
        <div className="flex-1 overflow-x-auto">
          <svg
            ref={svgRef}
            width="800"
            height="600"
            className="border border-border rounded-lg bg-card"
            viewBox="0 0 800 600"
          >
            {/* Arrow marker definitions - must be first */}
            <defs>
              <marker
                id="readArrow"
                markerWidth={8}
                markerHeight={6}
                refX={7}
                refY={3}
                orient="auto"
                markerUnits="strokeWidth"
              >
                 <polygon
                   points="0 0, 8 3, 0 6"
                   fill="hsl(330 81% 60%)"
                 />
              </marker>
              <marker
                id="modifyArrow"
                markerWidth={8}
                markerHeight={6}
                refX={7}
                refY={3}
                orient="auto"
                markerUnits="strokeWidth"
              >
                 <polygon
                   points="0 0, 8 3, 0 6"
                   fill="hsl(217 91% 60%)"
                 />
              </marker>
            </defs>

            {/* Time bucket columns */}
            {timeBuckets.map((bucket, index) => {
              const x = 100 + (index * 220);
              const accesses = bucket.accesses;
              
              return (
                <g key={index}>
                  {/* Time bucket container */}
                  <rect
                    x={x}
                    y={50}
                    width={200}
                    height={520}
                    rx={8}
                    fill="hsl(var(--card))"
                    stroke="hsl(var(--border))"
                    strokeWidth={1}
                  />
                  
                  {/* Hour label */}
                  <text
                    x={x + 100}
                    y={40}
                    textAnchor="middle"
                    fontSize="14"
                    fill="hsl(var(--foreground))"
                    fontWeight="bold"
                  >
                    {bucket.label}
                  </text>
                  
                  {/* Access count badge */}
                  <rect
                    x={x + 70}
                    y={60}
                    width={60}
                    height={20}
                    rx={10}
                    fill={accesses.length > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                  />
                  <text
                    x={x + 100}
                    y={73}
                    textAnchor="middle"
                    fontSize="10"
                    fill={accesses.length > 0 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))'}
                  >
                    {accesses.length} access{accesses.length !== 1 ? 'es' : ''}
                  </text>
                  
                  {/* Access details - Group by user and access type */}
                  {(() => {
                    // Group accesses by user and access type (max 2 nodes per user: read + modify)
                    const userAccessMap = new Map<string, { read?: DatasetAccess[], modify?: DatasetAccess[] }>();
                    
                    accesses.forEach(access => {
                      const userName = access.userName;
                      const isRead = access.accessType.toLowerCase().includes('read');
                      
                      if (!userAccessMap.has(userName)) {
                        userAccessMap.set(userName, {});
                      }
                      
                      const userAccess = userAccessMap.get(userName)!;
                      if (isRead) {
                        if (!userAccess.read) userAccess.read = [];
                        userAccess.read.push(access);
                      } else {
                        if (!userAccess.modify) userAccess.modify = [];
                        userAccess.modify.push(access);
                      }
                    });
                    
                    // Create access nodes (max 2 per user: one read, one modify)
                    const accessNodes: Array<{ user: string; type: 'read' | 'modify'; accesses: DatasetAccess[]; count: number }> = [];
                    
                    userAccessMap.forEach((accessTypes, userName) => {
                      if (accessTypes.read && accessTypes.read.length > 0) {
                        accessNodes.push({
                          user: userName,
                          type: 'read',
                          accesses: accessTypes.read,
                          count: accessTypes.read.length
                        });
                      }
                      if (accessTypes.modify && accessTypes.modify.length > 0) {
                        accessNodes.push({
                          user: userName,
                          type: 'modify',
                          accesses: accessTypes.modify,
                          count: accessTypes.modify.length
                        });
                      }
                    });
                    
                    // Calculate available height and node spacing to fit within container
                    const containerHeight = 520; // Total container height
                    const headerHeight = 60; // Height taken by hour label and access count
                    const availableHeight = containerHeight - headerHeight - 40; // Leave some padding
                    const maxNodes = Math.floor(availableHeight / 30); // 30px per node including spacing
                    const nodesToShow = Math.min(accessNodes.length, maxNodes);
                    const nodeSpacing = nodesToShow > 0 ? Math.min(35, availableHeight / nodesToShow) : 35;
                    
                    return (
                      <>
                        {accessNodes.slice(0, nodesToShow).map((node, nodeIndex) => {
                          const y = 110 + (nodeIndex * nodeSpacing); // Start after header area
                          const isRead = node.type === 'read';
                          const displayName = node.user.substring(0, 3);
                          
                          return (
                            <g key={`${node.user}-${node.type}-${nodeIndex}`}>
                              <circle
                                cx={x + 100}
                                cy={y + 15}
                                r={16}
                                fill={isRead ? 'hsl(330 81% 60%)' : 'hsl(217 91% 60%)'}
                                stroke="hsl(var(--border))"
                                strokeWidth={2}
                              />
                              <text
                                x={x + 100}
                                y={y + 12}
                                textAnchor="middle"
                                fontSize="8"
                                fill="white"
                                fontWeight="medium"
                              >
                                {displayName}
                              </text>
                              <text
                                x={x + 100}
                                y={y + 20}
                                textAnchor="middle"
                                fontSize="7"
                                fill="white"
                              >
                                {isRead ? 'R' : 'M'}{node.count > 1 ? node.count : ''}
                              </text>
                            </g>
                          );
                        })}
                        {accessNodes.length > nodesToShow && (
                          <text
                            x={x + 100}
                            y={550}
                            textAnchor="middle"
                            fontSize="10"
                            fill="hsl(var(--muted-foreground))"
                          >
                            +{accessNodes.length - nodesToShow} more
                          </text>
                        )}
                      </>
                    );
                  })()}
                 </g>
               );
             })}

             {/* Edges from selected entities to individual access circles */}
            {Array.from(selectedEntities).map((entityName) => {
              const entityIndex = visibleEntities.findIndex(e => e.name === entityName);
              if (entityIndex === -1) return null;
              
              // Calculate start position based on table row
              const startY = 100 + (entityIndex * 40); // Approximate table row height
              const startX = 0; // Left edge of SVG
              
              return timeBuckets.map((bucket, bucketIndex) => {
                const entityAccesses = bucket.accesses.filter(a => 
                  perspective === 'user-journey' 
                    ? a.datasetName === entityName
                    : a.datasetName === entityName
                );
                return entityAccesses.length === 0 ? null : (() => {
                  // Group accesses by user and access type for edge drawing
                  const userAccessMap = new Map<string, { read?: DatasetAccess[], modify?: DatasetAccess[] }>();
                  
                  entityAccesses.forEach(access => {
                    const userName = access.userName;
                    const isRead = access.accessType.toLowerCase().includes('read');
                    
                    if (!userAccessMap.has(userName)) {
                      userAccessMap.set(userName, {});
                    }
                    
                    const userAccess = userAccessMap.get(userName)!;
                    if (isRead) {
                      if (!userAccess.read) userAccess.read = [];
                      userAccess.read.push(access);
                    } else {
                      if (!userAccess.modify) userAccess.modify = [];
                      userAccess.modify.push(access);
                    }
                  });
                  
                  // Create edges for access nodes (max 2 per user: one read, one modify)
                  const accessNodes: Array<{ user: string; type: 'read' | 'modify'; accesses: DatasetAccess[] }> = [];
                  
                  userAccessMap.forEach((accessTypes, userName) => {
                    if (accessTypes.read && accessTypes.read.length > 0) {
                      accessNodes.push({
                        user: userName,
                        type: 'read',
                        accesses: accessTypes.read
                      });
                    }
                    if (accessTypes.modify && accessTypes.modify.length > 0) {
                      accessNodes.push({
                        user: userName,
                        type: 'modify',
                        accesses: accessTypes.modify
                      });
                    }
                  });
                  
                  // Calculate spacing to match the visual nodes
                  const containerHeight = 520;
                  const headerHeight = 60;
                  const availableHeight = containerHeight - headerHeight - 40;
                  const maxNodes = Math.floor(availableHeight / 30);
                  const nodesToShow = Math.min(accessNodes.length, maxNodes);
                  const nodeSpacing = nodesToShow > 0 ? Math.min(35, availableHeight / nodesToShow) : 35;
                  
                  return accessNodes.slice(0, nodesToShow).map((node, nodeIndex) => {
                    const bucketX = 100 + (bucketIndex * 220);
                    const accessY = 110 + (nodeIndex * nodeSpacing) + 15;
                    const accessX = bucketX + 100;
                    const isRead = node.type === 'read';
                    
                    // Calculate curved path
                    const midX = (startX + accessX) / 2;
                    const controlY = Math.min(startY, accessY) - 50;
                    const path = `M ${startX} ${startY} Q ${midX} ${controlY} ${accessX - 16} ${accessY}`;
                    
                    return (
                      <g key={`edge-${entityName}-${bucketIndex}-${node.user}-${node.type}`}>
                        <path
                          d={path}
                          fill="none"
                          stroke={isRead ? 'hsl(330 81% 60%)' : 'hsl(217 91% 60%)'}
                          strokeWidth={3}
                          opacity={0.8}
                          markerEnd={isRead ? "url(#readArrow)" : "url(#modifyArrow)"}
                          strokeDasharray={isRead ? "none" : "5,5"}
                        />
                      </g>
                    );
                  });
                })();
              });
            })}

            {/* Legend */}
            <g transform="translate(50, 560)">
              <circle cx={5} cy={5} r={4} fill="hsl(330 81% 60%)" />
              <text x={15} y={9} fontSize="10" fill="hsl(var(--foreground))">Read</text>
              
              <circle cx={60} cy={5} r={4} fill="hsl(217 91% 60%)" />
              <text x={70} y={9} fontSize="10" fill="hsl(var(--foreground))">Modify</text>
              
              <line x1={120} y1={5} x2={140} y2={5} stroke="hsl(var(--chart-2))" strokeWidth={2} />
              <text x={145} y={9} fontSize="10" fill="hsl(var(--foreground))">Solid = Read</text>
              
              <line x1={210} y1={5} x2={230} y2={5} stroke="hsl(var(--chart-1))" strokeWidth={2} strokeDasharray="3,3" />
              <text x={235} y={9} fontSize="10" fill="hsl(var(--foreground))">Dashed = Modify</text>
            </g>
          </svg>
        </div>
      </div>
      
      {selectedEntities.size === 0 && (
        <div className="text-center text-muted-foreground text-sm py-8">
          Click on {entityTypeLabel.toLowerCase()} nodes to see their {perspective === 'user-journey' ? 'dataset access' : 'user access'} patterns across time buckets
        </div>
      )}
      
      {selectedEntities.size > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2">
            Selected {entityTypeLabel}s ({selectedEntities.size})
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
      
      {uniqueEntities.length > maxNodesVisible && (
        <div className="text-xs text-muted-foreground mt-2 text-center">
          Showing {scrollOffset + 1}-{Math.min(scrollOffset + maxNodesVisible, uniqueEntities.length)} of {uniqueEntities.length} {entityTypeLabel.toLowerCase()}s
        </div>
      )}
    </div>
  );
};