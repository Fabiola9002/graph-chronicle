import { DatasetAccess } from "../DataJourneyDashboard";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

interface UserDatasetFlowProps {
  data: DatasetAccess[];
}

export const UserDatasetFlow = ({ data }: UserDatasetFlowProps) => {
  const flowData = useMemo(() => {
    const connections: { [key: string]: number } = {};
    const nodes = new Set<string>();
    
    data.forEach(access => {
      const connection = `${access.userName}→${access.datasetName}`;
      connections[connection] = (connections[connection] || 0) + 1;
      nodes.add(access.userName);
      nodes.add(access.datasetName);
    });
    
    const sortedConnections = Object.entries(connections)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20);
    
    return { connections: sortedConnections, totalNodes: nodes.size };
  }, [data]);

  const maxConnections = Math.max(...flowData.connections.map(([,count]) => count));

  const getFlowWidth = (count: number) => {
    const ratio = count / maxConnections;
    return Math.max(2, ratio * 8);
  };

  const getFlowColor = (count: number) => {
    const ratio = count / maxConnections;
    if (ratio > 0.8) return 'text-destructive';
    if (ratio > 0.6) return 'text-warning';
    if (ratio > 0.4) return 'text-accent';
    return 'text-info';
  };

  return (
    <div className="w-full h-full overflow-auto p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            User → Dataset Access Flows
          </h3>
          <Badge variant="outline" className="text-xs">
            {flowData.totalNodes} nodes
          </Badge>
        </div>
        
        <div className="space-y-2">
          {flowData.connections.map(([connection, count], index) => {
            const [user, dataset] = connection.split('→');
            const flowWidth = getFlowWidth(count);
            const flowColor = getFlowColor(count);
            
            return (
              <div 
                key={connection}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate max-w-20">
                    {user}
                  </div>
                  
                  <div className="flex-1 flex items-center gap-1">
                    <div 
                      className={`h-0.5 bg-current transition-all group-hover:h-1 ${flowColor}`}
                      style={{ width: `${Math.max(20, flowWidth * 4)}px` }}
                    />
                    <div className="text-xs text-muted-foreground">→</div>
                  </div>
                  
                  <div className="text-xs font-medium text-foreground truncate max-w-20">
                    {dataset}
                  </div>
                </div>
                
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${flowColor}`}
                >
                  {count}
                </Badge>
              </div>
            );
          })}
        </div>
        
        {flowData.connections.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            No access flows to display
          </div>
        )}
      </div>
    </div>
  );
};