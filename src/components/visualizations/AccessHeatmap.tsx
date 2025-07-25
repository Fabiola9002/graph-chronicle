import { DatasetAccess } from "../DataJourneyDashboard";
import { useMemo } from "react";

interface AccessHeatmapProps {
  data: DatasetAccess[];
}

export const AccessHeatmap = ({ data }: AccessHeatmapProps) => {
  const heatmapData = useMemo(() => {
    const userDatasetMatrix: { [key: string]: { [key: string]: number } } = {};
    const users = [...new Set(data.map(d => d.userName))];
    const datasets = [...new Set(data.map(d => d.datasetName))];
    
    // Initialize matrix
    users.forEach(user => {
      userDatasetMatrix[user] = {};
      datasets.forEach(dataset => {
        userDatasetMatrix[user][dataset] = 0;
      });
    });
    
    // Populate matrix with access counts
    data.forEach(access => {
      userDatasetMatrix[access.userName][access.datasetName]++;
    });
    
    return { matrix: userDatasetMatrix, users, datasets };
  }, [data]);

  const maxAccess = Math.max(
    ...Object.values(heatmapData.matrix).flatMap(userRow => 
      Object.values(userRow)
    )
  );

  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-muted/20';
    const intensity = count / maxAccess;
    if (intensity > 0.8) return 'bg-destructive';
    if (intensity > 0.6) return 'bg-warning';
    if (intensity > 0.4) return 'bg-accent';
    if (intensity > 0.2) return 'bg-info';
    return 'bg-success/50';
  };

  return (
    <div className="w-full h-full overflow-auto">
      <div className="min-w-max">
        {/* Header */}
        <div className="flex">
          <div className="w-32 h-8 flex items-center text-xs font-medium text-muted-foreground">
            Users / Datasets
          </div>
          {heatmapData.datasets.slice(0, 10).map(dataset => (
            <div 
              key={dataset}
              className="w-16 h-8 flex items-center justify-center text-xs font-medium text-muted-foreground border-l border-border"
              title={dataset}
            >
              {dataset.slice(0, 8)}...
            </div>
          ))}
        </div>
        
        {/* Heatmap Grid */}
        {heatmapData.users.slice(0, 15).map(user => (
          <div key={user} className="flex border-t border-border">
            <div className="w-32 h-8 flex items-center px-2 text-xs text-foreground border-r border-border">
              {user}
            </div>
            {heatmapData.datasets.slice(0, 10).map(dataset => {
              const count = heatmapData.matrix[user][dataset];
              return (
                <div
                  key={dataset}
                  className={`w-16 h-8 flex items-center justify-center text-xs font-medium border-l border-border cursor-pointer transition-all hover:scale-110 ${getIntensity(count)}`}
                  title={`${user} → ${dataset}: ${count} accesses`}
                >
                  {count > 0 ? count : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Access Intensity:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-muted/20 rounded"></div>
          <span>None</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-success/50 rounded"></div>
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-accent rounded"></div>
          <span>High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-destructive rounded"></div>
          <span>Very High</span>
        </div>
      </div>
    </div>
  );
};