import { DatasetAccess } from "../DataJourneyDashboard";
import { useMemo, useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, ChevronUp, ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

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
      const userMap = new Map<string, { 
        name: string; 
        datasets: Set<string>; 
        accesses: DatasetAccess[] 
      }>();
      
      data.forEach(access => {
        if (!userMap.has(access.userName)) {
          userMap.set(access.userName, {
            name: access.userName,
            datasets: new Set(),
            accesses: []
          });
        }
        const user = userMap.get(access.userName)!;
        user.datasets.add(access.datasetName);
        user.accesses.push(access);
      });
      
      return Array.from(userMap.values());
    } else {
      // Dataset journey perspective
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
          ? selectedEntities.has(access.userName)
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

  const entityTypeLabel = perspective === 'user-journey' ? 'User' : 'Dataset';

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
        {/* Entity Selection Table */}
        <div className="w-80 flex-shrink-0">
          <div className="border border-border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Select</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>
                    {perspective === 'user-journey' ? 'Dataset FQN' : 'User ID'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEntities.map((entity) => {
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
                        {perspective === 'user-journey' ? 'User' : 'Dataset'}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        <div className="max-w-32 truncate" title={entity.name}>
                          {entity.name}
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
          {uniqueEntities.length > maxNodesVisible && (
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

        {/* Connection Points */}
        <div className="flex flex-col justify-start pt-16 gap-8 px-4">
          {Array.from(selectedEntities).map((entityName) => {
            const entityIndex = visibleEntities.findIndex(e => e.name === entityName);
            if (entityIndex === -1) return null;
            
            const entity = visibleEntities[entityIndex];
            const readCount = entity.accesses.filter(a => 
              a.accessType.toLowerCase().includes('read')
            ).length;
            const modifyCount = entity.accesses.filter(a => 
              !a.accessType.toLowerCase().includes('read')
            ).length;
            
            return (
              <div key={entityName} className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium shadow-lg">
                  {entityName.substring(0, 2).toUpperCase()}
                </div>
                <div className="text-xs text-muted-foreground">
                  <div className="font-medium">{entityName}</div>
                  <div>{readCount}R / {modifyCount}M</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Visualization Area */}
        <div className="flex-1 relative">
          {/* Time bucket columns */}
          <div className="flex gap-4 h-[500px]">
            {timeBuckets.map((bucket, index) => {
              const accesses = bucket.accesses;
              
              return (
                <div 
                  key={index}
                  className="flex-1 border border-border rounded-lg bg-card"
                >
                  {/* Hour label */}
                  <div className="text-center font-bold text-lg p-4 border-b">
                    {bucket.label}
                  </div>
                  
                  {/* Access count badge */}
                  <div className="flex justify-center p-4">
                    <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                      accesses.length > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {accesses.length} access{accesses.length !== 1 ? 'es' : ''}
                    </div>
                  </div>
                  
                  {/* Access details */}
                  <div className="p-4 space-y-3">
                    {accesses.slice(0, 12).map((access, accessIndex) => {
                      const isRead = access.accessType.toLowerCase().includes('read');
                      const displayName = perspective === 'user-journey' 
                        ? access.datasetName
                        : access.userName;
                      
                      return (
                        <div 
                          key={`${access.id}-${accessIndex}`}
                          className={`p-3 rounded-lg border-2 ${
                            isRead ? 'bg-chart-2/10 border-chart-2' : 'bg-chart-1/10 border-chart-1'
                          }`}
                          data-access-target={`${access.id}-${index}-${accessIndex}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                              isRead ? 'bg-chart-2' : 'bg-chart-1'
                            }`}>
                              {isRead ? 'R' : 'M'}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium truncate" title={displayName}>
                                {displayName.length > 15 ? displayName.substring(0, 15) + '...' : displayName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {access.accessType}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {accesses.length > 12 && (
                      <div className="text-center text-sm text-muted-foreground p-2 border border-dashed border-muted-foreground/50 rounded">
                        +{accesses.length - 12} more accesses
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* SVG Overlay for black connecting arrows */}
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            className="absolute top-0 left-0 pointer-events-none"
            style={{ zIndex: 10 }}
          >
            <defs>
              <marker
                id="blackArrow"
                markerWidth={10}
                markerHeight={10}
                refX={9}
                refY={3}
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon
                  points="0 0, 10 3, 0 6"
                  fill="black"
                />
              </marker>
            </defs>

            {/* Draw black connecting arrows */}
            {Array.from(selectedEntities).map((entityName, entityDisplayIndex) => {
              const entity = uniqueEntities.find(e => e.name === entityName);
              if (!entity) return null;

              return timeBuckets.map((bucket, bucketIndex) => {
                const entityAccesses = bucket.accesses.filter(a => 
                  perspective === 'user-journey' 
                    ? a.userName === entityName
                    : a.datasetName === entityName
                );
                if (entityAccesses.length === 0) return null;

                return entityAccesses.slice(0, 12).map((access, accessIndex) => {
                  const isRead = access.accessType.toLowerCase().includes('read');
                  
                  // Calculate positions - start from the actual black circle connection point
                  const connectionPointX = 340; // Move way left closer to the table
                  const connectionPointY = 110 + (entityDisplayIndex * 56); // Exact vertical position
                  
                  // Target position in the time bucket
                  const bucketStartX = 150; // Start of time buckets area
                  const bucketWidth = 200; // Width of each time bucket
                  const targetX = bucketStartX + (bucketIndex * (bucketWidth + 16)) + (bucketWidth / 2);
                  const targetY = 180 + (accessIndex * 60);
                  
                  // Create path from black circle edge to access item
                  const controlX1 = connectionPointX + 80;
                  const controlY1 = connectionPointY - 30;
                  const controlX2 = targetX - 80;
                  const controlY2 = targetY - 30;
                  
                  const path = `M ${connectionPointX + 24} ${connectionPointY} C ${controlX1} ${controlY1} ${controlX2} ${controlY2} ${targetX - 15} ${targetY}`;
                  
                  return (
                    <g key={`connection-${entityName}-${bucketIndex}-${accessIndex}`}>
                      <path
                        d={path}
                        fill="none"
                        stroke="black"
                        strokeWidth={3}
                        opacity={0.9}
                        markerEnd="url(#blackArrow)"
                        strokeDasharray={isRead ? "none" : "8,4"}
                      />
                    </g>
                  );
                });
              });
            })}
          </svg>
          
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
              <div className="w-6 h-px bg-black"></div>
              <span>Solid = Read</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-px bg-black opacity-60" style={{ backgroundImage: 'repeating-linear-gradient(to right, currentColor 0, currentColor 3px, transparent 3px, transparent 6px)' }}></div>
              <span>Dashed = Modify</span>
            </div>
          </div>
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