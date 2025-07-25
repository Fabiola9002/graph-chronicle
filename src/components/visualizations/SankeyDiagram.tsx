import { DatasetAccess } from "../DataJourneyDashboard";
import { useMemo } from "react";

interface SankeyDiagramProps {
  data: DatasetAccess[];
}

export const SankeyDiagram = ({ data }: SankeyDiagramProps) => {
  const sankeyData = useMemo(() => {
    const flows: { [key: string]: number } = {};
    
    data.forEach(access => {
      const flow = `${access.department}→${access.datasetType}→${access.accessType}`;
      flows[flow] = (flows[flow] || 0) + 1;
    });
    
    return Object.entries(flows)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15);
  }, [data]);

  const maxFlow = Math.max(...sankeyData.map(([,count]) => count), 1);

  return (
    <div className="w-full h-full p-4">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">
          Department → Dataset Type → Access Pattern
        </h3>
        
        <div className="space-y-2">
          {sankeyData.map(([flow, count]) => {
            const [dept, type, access] = flow.split('→');
            const width = (count / maxFlow) * 100;
            
            return (
              <div key={flow} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{dept} → {type} → {access}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
                <div className="w-full bg-muted/20 rounded-full h-2">
                  <div 
                    className="bg-accent h-2 rounded-full transition-all"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};