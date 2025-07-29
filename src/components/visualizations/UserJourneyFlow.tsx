import { DatasetAccess } from "../DataJourneyDashboard";
import { useMemo, useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, ChevronUp, ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface UserJourneyFlowProps {
  data: DatasetAccess[];
}

interface TimeBucket {
  hour: number;
  label: string;
  accesses: DatasetAccess[];
}

export const UserJourneyFlow = ({ data }: UserJourneyFlowProps) => {
  const [currentHour, setCurrentHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [scrollOffset, setScrollOffset] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const maxNodesVisible = 7;
  const nodeHeight = 80;

  // Get unique users for the left side nodes
  const uniqueUsers = useMemo(() => {
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
  }, [data]);

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
        if (selectedUsers.size === 0) return false;
        
        const accessTime = new Date(access.timestamp);
        const isInTimeRange = accessTime >= bucketStart && accessTime < bucketEnd;
        const isSelectedUser = selectedUsers.has(access.userName);
        
        return isInTimeRange && isSelectedUser;
      });
      
      buckets.push({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        accesses: relevantAccesses
      });
    }
    
    return buckets;
  }, [data, currentHour, selectedUsers]);

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

  const toggleUserSelection = (userName: string) => {
    setSelectedUsers(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(userName)) {
        newSelected.delete(userName);
      } else {
        newSelected.add(userName);
      }
      return newSelected;
    });
  };

  const handleScrollUp = () => {
    setScrollOffset(prev => Math.max(0, prev - 1));
  };

  const handleScrollDown = () => {
    setScrollOffset(prev => Math.min(uniqueUsers.length - maxNodesVisible, prev + 1));
  };

  const visibleUsers = uniqueUsers.slice(scrollOffset, scrollOffset + maxNodesVisible);
  const canScrollUp = scrollOffset > 0;
  const canScrollDown = scrollOffset < uniqueUsers.length - maxNodesVisible;

  return (
    <div className="w-full h-full p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">User Journey Flow</h3>
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
      
      <div className="relative w-full overflow-x-auto">
        {/* Scroll controls */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 flex flex-col gap-2">
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

        <svg
          ref={svgRef}
          width="1200"
          height="600"
          className="border border-border rounded-lg bg-card"
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
                fill="hsl(var(--chart-2))"
                stroke="hsl(var(--chart-2))"
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
                fill="hsl(var(--chart-1))"
                stroke="hsl(var(--chart-1))"
              />
            </marker>
          </defs>

          {/* User nodes on the left */}
          {visibleUsers.map((user, index) => {
            const y = 80 + (index * nodeHeight);
            const isSelected = selectedUsers.has(user.name);
            
            return (
              <g key={user.name}>
                <circle
                  cx={125}
                  cy={y}
                  r={35}
                  fill={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                  stroke={isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--border))'}
                  strokeWidth={3}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => toggleUserSelection(user.name)}
                />
                <text
                  x={125}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="11"
                  fill={isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))'}
                  className="cursor-pointer font-medium"
                  onClick={() => toggleUserSelection(user.name)}
                >
                  {user.name.length > 8 ? user.name.substring(0, 8) + '...' : user.name}
                </text>
                <text
                  x={125}
                  y={y + 8}
                  textAnchor="middle"
                  fontSize="9"
                  fill={isSelected ? 'hsl(var(--primary-foreground) / 0.8)' : 'hsl(var(--muted-foreground))'}
                  className="cursor-pointer"
                  onClick={() => toggleUserSelection(user.name)}
                >
                  {user.datasets.size} datasets
                </text>
                <text
                  x={125}
                  y={y + 20}
                  textAnchor="middle"
                  fontSize="8"
                  fill={isSelected ? 'hsl(var(--primary-foreground) / 0.6)' : 'hsl(var(--muted-foreground))'}
                  className="cursor-pointer"
                  onClick={() => toggleUserSelection(user.name)}
                >
                  {user.accesses.length} total
                </text>
              </g>
            );
          })}

          {/* Time bucket columns */}
          {timeBuckets.map((bucket, index) => {
            const x = 350 + (index * 250);
            const accesses = bucket.accesses;
            
            return (
              <g key={index}>
                {/* Time bucket container */}
                <rect
                  x={x}
                  y={50}
                  width={220}
                  height={500}
                  rx={8}
                  fill="hsl(var(--card))"
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                />
                
                {/* Hour label */}
                <text
                  x={x + 110}
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
                  x={x + 80}
                  y={60}
                  width={60}
                  height={20}
                  rx={10}
                  fill={accesses.length > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                />
                <text
                  x={x + 110}
                  y={73}
                  textAnchor="middle"
                  fontSize="10"
                  fill={accesses.length > 0 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))'}
                >
                  {accesses.length} access{accesses.length !== 1 ? 'es' : ''}
                </text>
                
                {/* Access details */}
                {accesses.slice(0, 12).map((access, accessIndex) => {
                  const y = 100 + (accessIndex * 35);
                  const isRead = access.accessType.toLowerCase().includes('read');
                  
                  return (
                    <g key={`${access.id}-${accessIndex}`}>
                      <circle
                        cx={x + 110}
                        cy={y + 15}
                        r={16}
                        fill={isRead ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-1))'}
                        stroke="hsl(var(--border))"
                        strokeWidth={2}
                      />
                      <text
                        x={x + 110}
                        y={y + 12}
                        textAnchor="middle"
                        fontSize="8"
                        fill="white"
                        fontWeight="medium"
                      >
                        {access.datasetName.substring(0, 3)}
                      </text>
                      <text
                        x={x + 110}
                        y={y + 20}
                        textAnchor="middle"
                        fontSize="7"
                        fill="white"
                      >
                        {isRead ? 'R' : 'M'}
                      </text>
                    </g>
                  );
                })}
                
                {accesses.length > 12 && (
                  <text
                    x={x + 110}
                    y={520}
                    textAnchor="middle"
                    fontSize="10"
                    fill="hsl(var(--muted-foreground))"
                  >
                    +{accesses.length - 12} more
                  </text>
                )}
              </g>
            );
          })}

          {/* Edges from selected users to individual access circles */}
          {Array.from(selectedUsers).map((userName) => {
            const userIndex = visibleUsers.findIndex(u => u.name === userName);
            if (userIndex === -1) return null;
            
            const startY = 80 + (userIndex * nodeHeight);
            const startX = 160; // Right edge of user circle
            
            return timeBuckets.map((bucket, bucketIndex) => {
              const userAccesses = bucket.accesses.filter(a => a.userName === userName);
              if (userAccesses.length === 0) return null;
              
              const bucketX = 350 + (bucketIndex * 250);
              
              return userAccesses.slice(0, 12).map((access, accessIndex) => {
                const accessY = 100 + (accessIndex * 35) + 15;
                const accessX = bucketX + 110;
                const isRead = access.accessType.toLowerCase().includes('read');
                
                // Calculate curved path
                const midX = (startX + accessX) / 2;
                const controlY = Math.min(startY, accessY) - 30;
                const path = `M ${startX} ${startY} Q ${midX} ${controlY} ${accessX - 16} ${accessY}`;
                
                return (
                  <g key={`edge-${userName}-${bucketIndex}-${accessIndex}`}>
                    <path
                      d={path}
                      fill="none"
                      stroke={isRead ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-1))'}
                      strokeWidth={2}
                      opacity={0.7}
                      markerEnd={isRead ? "url(#readArrow)" : "url(#modifyArrow)"}
                      strokeDasharray={isRead ? "none" : "5,5"}
                    />
                  </g>
                );
              });
            });
          })}

          {/* Legend */}
          <g transform="translate(50, 550)">
            <circle cx={5} cy={5} r={4} fill="hsl(var(--chart-2))" />
            <text x={15} y={9} fontSize="10" fill="hsl(var(--foreground))">Read</text>
            
            <circle cx={60} cy={5} r={4} fill="hsl(var(--chart-1))" />
            <text x={70} y={9} fontSize="10" fill="hsl(var(--foreground))">Modify</text>
            
            <line x1={120} y1={5} x2={140} y2={5} stroke="hsl(var(--chart-2))" strokeWidth={2} />
            <text x={145} y={9} fontSize="10" fill="hsl(var(--foreground))">Solid = Read</text>
            
            <line x1={210} y1={5} x2={230} y2={5} stroke="hsl(var(--chart-1))" strokeWidth={2} strokeDasharray="3,3" />
            <text x={235} y={9} fontSize="10" fill="hsl(var(--foreground))">Dashed = Modify</text>
          </g>
        </svg>
      </div>
      
      {selectedUsers.size === 0 && (
        <div className="text-center text-muted-foreground text-sm py-8">
          Click on user nodes to see their dataset access patterns across time buckets
        </div>
      )}
      
      {selectedUsers.size > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2">
            Selected Users ({selectedUsers.size})
          </div>
          <div className="flex flex-wrap gap-1">
            {Array.from(selectedUsers).map(user => (
              <Badge key={user} variant="outline" className="text-xs">
                {user}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {uniqueUsers.length > maxNodesVisible && (
        <div className="text-xs text-muted-foreground mt-2 text-center">
          Showing {scrollOffset + 1}-{Math.min(scrollOffset + maxNodesVisible, uniqueUsers.length)} of {uniqueUsers.length} users
        </div>
      )}
    </div>
  );
};