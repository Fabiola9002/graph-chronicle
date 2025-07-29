import { DatasetAccess } from "../DataJourneyDashboard";
import { useMemo, useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, ChevronRight, ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

interface UserJourneyFlowProps {
  data: DatasetAccess[];
}

interface TreeNode {
  id: string;
  label: string;
  type: 'root' | 'user' | 'platform' | 'dataset';
  children?: TreeNode[];
  parent?: string;
  isExpanded?: boolean;
  isSelected?: boolean;
  data?: DatasetAccess[];
}

interface TimeBucket {
  hour: number;
  label: string;
  accesses: DatasetAccess[];
}

export const UserJourneyFlow = ({ data }: UserJourneyFlowProps) => {
  const [currentHour, setCurrentHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedDatasets, setSelectedDatasets] = useState<Set<string>>(new Set());
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Generate tree structure
  const treeData = useMemo(() => {
    const userMap = new Map<string, Set<string>>();
    const platformMap = new Map<string, Map<string, Set<string>>>();
    
    data.forEach(access => {
      if (!userMap.has(access.userName)) {
        userMap.set(access.userName, new Set());
      }
      userMap.get(access.userName)?.add(access.datasetType);
      
      if (!platformMap.has(access.userName)) {
        platformMap.set(access.userName, new Map());
      }
      if (!platformMap.get(access.userName)?.has(access.datasetType)) {
        platformMap.get(access.userName)?.set(access.datasetType, new Set());
      }
      platformMap.get(access.userName)?.get(access.datasetType)?.add(access.datasetName);
    });
    
    const rootNode: TreeNode = {
      id: 'root',
      label: 'Data Access Tree',
      type: 'root',
      isExpanded: true,
      children: []
    };
    
    userMap.forEach((platforms, userName) => {
      const userNode: TreeNode = {
        id: `user-${userName}`,
        label: userName,
        type: 'user',
        parent: 'root',
        children: []
      };
      
      platforms.forEach(platform => {
        const platformNode: TreeNode = {
          id: `platform-${userName}-${platform}`,
          label: platform,
          type: 'platform',
          parent: userNode.id,
          children: []
        };
        
        const datasets = platformMap.get(userName)?.get(platform) || new Set();
        datasets.forEach(dataset => {
          const datasetAccesses = data.filter(d => 
            d.userName === userName && 
            d.datasetType === platform && 
            d.datasetName === dataset
          );
          
          const datasetNode: TreeNode = {
            id: `dataset-${userName}-${platform}-${dataset}`,
            label: dataset,
            type: 'dataset',
            parent: platformNode.id,
            data: datasetAccesses
          };
          
          platformNode.children?.push(datasetNode);
        });
        
        userNode.children?.push(platformNode);
      });
      
      rootNode.children?.push(userNode);
    });
    
    return rootNode;
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
        if (selectedDatasets.size === 0) return false;
        
        const accessTime = new Date(access.timestamp);
        const isInTimeRange = accessTime >= bucketStart && accessTime < bucketEnd;
        const isSelectedDataset = selectedDatasets.has(access.datasetName);
        
        return isInTimeRange && isSelectedDataset;
      });
      
      buckets.push({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        accesses: relevantAccesses
      });
    }
    
    return buckets;
  }, [data, currentHour, selectedDatasets]);

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

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return newExpanded;
    });
  };

  const toggleDatasetSelection = (datasetName: string) => {
    setSelectedDatasets(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(datasetName)) {
        newSelected.delete(datasetName);
      } else {
        newSelected.add(datasetName);
      }
      return newSelected;
    });
  };

  const renderTreeNode = (node: TreeNode, level: number = 0): JSX.Element => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const indent = level * 20;

    return (
      <div key={node.id} className="select-none">
        <div 
          className="flex items-center gap-2 py-1 px-2 hover:bg-muted/50 rounded cursor-pointer"
          style={{ paddingLeft: `${indent + 8}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleNode(node.id)}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
          
          {!hasChildren && <div className="w-4" />}
          
          {node.type === 'dataset' && (
            <Checkbox
              checked={selectedDatasets.has(node.label)}
              onCheckedChange={() => toggleDatasetSelection(node.label)}
              className="w-3 h-3"
            />
          )}
          
          <span 
            className={`text-sm ${
              node.type === 'root' ? 'font-bold text-foreground' :
              node.type === 'user' ? 'font-medium text-primary' :
              node.type === 'platform' ? 'text-accent' :
              'text-muted-foreground'
            }`}
          >
            {node.label}
          </span>
          
          {node.type === 'dataset' && selectedDatasets.has(node.label) && (
            <Badge variant="secondary" className="text-xs ml-auto">
              {node.data?.length || 0}
            </Badge>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children?.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const getConnectionPath = (startY: number, bucketIndex: number) => {
    const startX = 350;
    const endX = 450 + (bucketIndex * 200);
    const endY = 100;
    const midX = (startX + endX) / 2;
    
    return `M ${startX} ${startY} Q ${midX} ${startY} ${endX} ${endY}`;
  };

  return (
    <div className="w-full h-full flex p-4">
      {/* Left Panel - Tree Structure */}
      <div className="w-80 border-r border-border pr-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Data Access Tree</h3>
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
        
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {renderTreeNode(treeData)}
        </div>
        
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2">Time Control</div>
          <Slider
            value={[currentHour]}
            onValueChange={([value]) => setCurrentHour(value)}
            max={23}
            step={1}
            className="w-full"
          />
          <div className="text-xs text-muted-foreground mt-1">
            Current Hour: {currentHour.toString().padStart(2, '0')}:00
          </div>
        </div>
        
        {selectedDatasets.size > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground mb-2">
              Selected Datasets ({selectedDatasets.size})
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from(selectedDatasets).map(dataset => (
                <Badge key={dataset} variant="outline" className="text-xs">
                  {dataset}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Time Buckets */}
      <div className="flex-1 pl-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Time Window Analysis</h3>
          <Badge variant="outline" className="text-xs">
            3-Hour Window
          </Badge>
        </div>
        
        <div className="relative">
          <svg
            ref={svgRef}
            width="100%"
            height="400"
            className="border border-border rounded-lg bg-card"
          >
            {/* Time bucket columns */}
            {timeBuckets.map((bucket, index) => {
              const x = 100 + (index * 200);
              const accesses = bucket.accesses;
              
              return (
                <g key={index}>
                  {/* Column separator */}
                  <line
                    x1={x}
                    y1={20}
                    x2={x}
                    y2={380}
                    stroke="hsl(var(--border))"
                    strokeDasharray="5,5"
                    opacity={0.3}
                  />
                  
                  {/* Hour label */}
                  <text
                    x={x + 90}
                    y={15}
                    textAnchor="middle"
                    fontSize="12"
                    fill="hsl(var(--foreground))"
                    fontWeight="bold"
                  >
                    {bucket.label}
                  </text>
                  
                  {/* Access count badge */}
                  <rect
                    x={x + 60}
                    y={30}
                    width={60}
                    height={20}
                    rx={10}
                    fill={accesses.length > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                  />
                  <text
                    x={x + 90}
                    y={43}
                    textAnchor="middle"
                    fontSize="10"
                    fill={accesses.length > 0 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))'}
                  >
                    {accesses.length} access{accesses.length !== 1 ? 'es' : ''}
                  </text>
                  
                  {/* Access details */}
                  {accesses.slice(0, 8).map((access, accessIndex) => {
                    const y = 70 + (accessIndex * 35);
                    const isRead = access.accessType.toLowerCase().includes('read');
                    
                    return (
                      <g key={`${access.id}-${accessIndex}`}>
                        <rect
                          x={x + 20}
                          y={y}
                          width={140}
                          height={25}
                          rx={4}
                          fill={isRead ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--destructive) / 0.1)'}
                          stroke={isRead ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'}
                          strokeWidth={1}
                        />
                        <text
                          x={x + 25}
                          y={y + 12}
                          fontSize="9"
                          fill="hsl(var(--foreground))"
                        >
                          {access.userName}
                        </text>
                        <text
                          x={x + 25}
                          y={y + 22}
                          fontSize="8"
                          fill="hsl(var(--muted-foreground))"
                        >
                          {access.accessType}
                        </text>
                        <circle
                          cx={x + 150}
                          cy={y + 12}
                          r={4}
                          fill={isRead ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'}
                        />
                      </g>
                    );
                  })}
                  
                  {accesses.length > 8 && (
                    <text
                      x={x + 90}
                      y={350}
                      textAnchor="middle"
                      fontSize="10"
                      fill="hsl(var(--muted-foreground))"
                    >
                      +{accesses.length - 8} more
                    </text>
                  )}
                </g>
              );
            })}
            
            {/* Legend */}
            <g transform="translate(20, 360)">
              <circle cx={5} cy={5} r={4} fill="hsl(var(--primary))" />
              <text x={15} y={9} fontSize="10" fill="hsl(var(--foreground))">Read</text>
              
              <circle cx={60} cy={5} r={4} fill="hsl(var(--destructive))" />
              <text x={70} y={9} fontSize="10" fill="hsl(var(--foreground))">Modify</text>
            </g>
          </svg>
        </div>
        
        {selectedDatasets.size === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            Select datasets from the tree to see their access patterns across time buckets
          </div>
        )}
      </div>
    </div>
  );
};