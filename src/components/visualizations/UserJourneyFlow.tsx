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

  // Get unique datasets for the left side nodes
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

  // Get dynamic user nodes based on selected datasets
  const dynamicUserNodes = useMemo(() => {
    const userMap = new Map<string, { 
      name: string; 
      accesses: DatasetAccess[];
      readCount: number;
      modifyCount: number;
    }>();
    
    data.forEach(access => {
      if (selectedEntities.has(access.datasetName)) {
        if (!userMap.has(access.userName)) {
          userMap.set(access.userName, {
            name: access.userName,
            accesses: [],
            readCount: 0,
            modifyCount: 0
          });
        }
        const user = userMap.get(access.userName)!;
        user.accesses.push(access);
        if (access.accessType.toLowerCase().includes('read')) {
          user.readCount++;
        } else {
          user.modifyCount++;
        }
      }
    });
    
    return Array.from(userMap.values());
  }, [data, selectedEntities]);

  // Auto-select first few datasets for initial visibility
  useEffect(() => {
    if (uniqueDatasets.length > 0 && selectedEntities.size === 0) {
      const datasetsToSelect = uniqueDatasets.slice(0, Math.min(3, uniqueDatasets.length));
      setSelectedEntities(new Set(datasetsToSelect.map(e => e.name)));
    }
  }, [uniqueDatasets, selectedEntities.size]);

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
    setScrollOffset(prev => Math.min(uniqueDatasets.length - maxNodesVisible, prev + 1));
  };

  const visibleDatasets = uniqueDatasets.slice(scrollOffset, scrollOffset + maxNodesVisible);
  const canScrollUp = scrollOffset > 0;
  const canScrollDown = scrollOffset < uniqueDatasets.length - maxNodesVisible;

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
                {visibleDatasets.map((dataset) => {
                  const isSelected = selectedEntities.has(dataset.name);
                  const readCount = dataset.accesses.filter(a => 
                    a.accessType.toLowerCase().includes('read')
                  ).length;
                  const modifyCount = dataset.accesses.filter(a => 
                    !a.accessType.toLowerCase().includes('read')
                  ).length;
                  
                  return (
                    <TableRow key={dataset.name}>
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

        {/* Dynamic User Nodes */}
        <div className="flex flex-col justify-start pt-16 gap-4 px-4 w-40">
          {dynamicUserNodes.map((user, index) => (
            <div key={user.name} className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground text-xs font-medium shadow-lg">
                {user.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="text-xs text-muted-foreground">
                <div className="font-medium truncate w-20" title={user.name}>{user.name}</div>
                <div>{user.readCount}R / {user.modifyCount}M</div>
              </div>
            </div>
          ))}
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
                  
                  {/* R/M Circles for each user */}
                  <div className="p-4 space-y-4" style={{ paddingTop: '110px' }}>
                    {dynamicUserNodes.map((user, userIndex) => {
                      const userAccesses = bucket.accesses.filter(a => a.userName === user.name);
                      if (userAccesses.length === 0) return null;

                      const readCount = userAccesses.filter(a => a.accessType.toLowerCase().includes('read')).length;
                      const modifyCount = userAccesses.filter(a => !a.accessType.toLowerCase().includes('read')).length;

                      return (
                        <div key={`circles-${user.name}-${index}`} className="space-y-2">
                          {/* Read circle */}
                          {readCount > 0 && (
                            <div className="flex justify-center">
                              <div className="w-12 h-12 rounded-full bg-chart-2 flex items-center justify-center text-white font-bold shadow-lg">
                                R{readCount > 1 ? readCount : ''}
                              </div>
                            </div>
                          )}
                          
                          {/* Modify circle */}
                          {modifyCount > 0 && (
                            <div className="flex justify-center">
                              <div className="w-12 h-12 rounded-full bg-chart-1 flex items-center justify-center text-white font-bold shadow-lg">
                                M{modifyCount > 1 ? modifyCount : ''}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                id="primaryArrow"
                markerWidth={10}
                markerHeight={10}
                refX={9}
                refY={3}
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon
                  points="0 0, 10 3, 0 6"
                  fill="hsl(var(--primary))"
                />
              </marker>
              <marker
                id="readArrow"
                markerWidth={10}
                markerHeight={10}
                refX={9}
                refY={3}
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon
                  points="0 0, 10 3, 0 6"
                  fill="hsl(var(--chart-2))"
                />
              </marker>
              <marker
                id="modifyArrow"
                markerWidth={10}
                markerHeight={10}
                refX={9}
                refY={3}
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon
                  points="0 0, 10 3, 0 6"
                  fill="hsl(var(--chart-1))"
                />
              </marker>
            </defs>

            {/* Draw arrows from datasets to user nodes */}
            {Array.from(selectedEntities).map((datasetName, datasetIndex) => {
              return dynamicUserNodes.map((user, userIndex) => {
                // Check if this user has accesses to this dataset
                const hasAccess = user.accesses.some(access => access.datasetName === datasetName);
                if (!hasAccess) return null;

                // Dataset to user arrow
                const datasetY = 110 + (datasetIndex * 56);
                const userY = 110 + (userIndex * 48);
                const datasetToUserPath = `M 320 ${datasetY} L 380 ${userY}`;

                return (
                  <g key={`dataset-to-user-${datasetName}-${user.name}`}>
                    <path
                      d={datasetToUserPath}
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      opacity={0.8}
                      markerEnd="url(#primaryArrow)"
                    />
                  </g>
                );
              });
            })}

            {/* Draw arrows from user nodes to time window circles */}
            {dynamicUserNodes.map((user, userIndex) => {
              return timeBuckets.map((bucket, bucketIndex) => {
                const userAccesses = bucket.accesses.filter(a => a.userName === user.name);
                if (userAccesses.length === 0) return null;

                // Group accesses by type and count
                const readCount = userAccesses.filter(a => a.accessType.toLowerCase().includes('read')).length;
                const modifyCount = userAccesses.filter(a => !a.accessType.toLowerCase().includes('read')).length;

                const userY = 110 + (userIndex * 48);
                const bucketCenterX = 540 + (bucketIndex * 150);
                
                const paths = [];
                
                // Read access arrow if any
                if (readCount > 0) {
                  const readCircleY = 160 + (userIndex * 80);
                  const userToReadPath = `M 420 ${userY} C 460 ${userY} 500 ${readCircleY} ${bucketCenterX - 20} ${readCircleY}`;
                  paths.push(
                    <g key={`user-to-read-${user.name}-${bucketIndex}`}>
                      <path
                        d={userToReadPath}
                        fill="none"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        opacity={0.8}
                        markerEnd="url(#readArrow)"
                      />
                    </g>
                  );
                }

                // Modify access arrow if any
                if (modifyCount > 0) {
                  const modifyCircleY = 200 + (userIndex * 80);
                  const userToModifyPath = `M 420 ${userY} C 460 ${userY} 500 ${modifyCircleY} ${bucketCenterX - 20} ${modifyCircleY}`;
                  paths.push(
                    <g key={`user-to-modify-${user.name}-${bucketIndex}`}>
                      <path
                        d={userToModifyPath}
                        fill="none"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                        opacity={0.8}
                        strokeDasharray="8,4"
                        markerEnd="url(#modifyArrow)"
                      />
                    </g>
                  );
                }

                return paths;
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
      
      {uniqueDatasets.length > maxNodesVisible && (
        <div className="text-xs text-muted-foreground mt-2 text-center">
          Showing {scrollOffset + 1}-{Math.min(scrollOffset + maxNodesVisible, uniqueDatasets.length)} of {uniqueDatasets.length} datasets
        </div>
      )}
    </div>
  );
};