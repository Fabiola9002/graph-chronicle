import { DatasetAccess } from "../DataJourneyDashboard";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

interface TimelineChartProps {
  data: DatasetAccess[];
}

export const TimelineChart = ({ data }: TimelineChartProps) => {
  const timelineData = useMemo(() => {
    const hourly: { [key: string]: number } = {};
    const daily: { [key: string]: number } = {};
    
    data.forEach(access => {
      const hour = access.timestamp.toISOString().slice(0, 13); // YYYY-MM-DDTHH
      const day = access.timestamp.toISOString().slice(0, 10); // YYYY-MM-DD
      
      hourly[hour] = (hourly[hour] || 0) + 1;
      daily[day] = (daily[day] || 0) + 1;
    });
    
    const sortedHourly = Object.entries(hourly)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-24); // Last 24 hours
      
    const sortedDaily = Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7); // Last 7 days
    
    return { hourly: sortedHourly, daily: sortedDaily };
  }, [data]);

  const maxHourlyAccess = Math.max(...timelineData.hourly.map(([,count]) => count), 1);
  const maxDailyAccess = Math.max(...timelineData.daily.map(([,count]) => count), 1);

  const getBarHeight = (count: number, max: number) => {
    return Math.max(4, (count / max) * 100);
  };

  return (
    <div className="w-full h-full p-4 space-y-6">
      {/* Hourly Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            Hourly Access Pattern
          </h3>
          <Badge variant="outline" className="text-xs">
            Last 24 Hours
          </Badge>
        </div>
        
        <div className="h-24 flex items-end gap-1">
          {timelineData.hourly.map(([hour, count]) => {
            const height = getBarHeight(count, maxHourlyAccess);
            const time = new Date(hour + ':00:00').toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              hour12: false 
            });
            
            return (
              <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-accent rounded-t transition-all hover:bg-accent/80"
                  style={{ height: `${height}%` }}
                  title={`${time}: ${count} accesses`}
                />
                <div className="text-xs text-muted-foreground transform -rotate-45 origin-center">
                  {time}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            Daily Access Trend
          </h3>
          <Badge variant="outline" className="text-xs">
            Last 7 Days
          </Badge>
        </div>
        
        <div className="h-32 flex items-end gap-2">
          {timelineData.daily.map(([day, count]) => {
            const height = getBarHeight(count, maxDailyAccess);
            const date = new Date(day).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            });
            
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-info rounded-t transition-all hover:bg-info/80"
                  style={{ height: `${height}%` }}
                  title={`${date}: ${count} accesses`}
                />
                <div className="text-xs text-muted-foreground text-center">
                  {date}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
        <div className="text-center">
          <div className="text-lg font-bold text-accent">
            {timelineData.hourly.reduce((sum, [,count]) => sum + count, 0)}
          </div>
          <div className="text-xs text-muted-foreground">
            Last 24h Accesses
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-info">
            {Math.round(timelineData.daily.reduce((sum, [,count]) => sum + count, 0) / timelineData.daily.length)}
          </div>
          <div className="text-xs text-muted-foreground">
            Avg Daily Accesses
          </div>
        </div>
      </div>
    </div>
  );
};