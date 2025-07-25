import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DatasetAccess } from "./DataJourneyDashboard";
import { Users, Database, Activity, TrendingUp, Clock, Shield } from "lucide-react";
import { useMemo } from "react";

interface MetricCardsProps {
  data: DatasetAccess[];
}

export const MetricCards = ({ data }: MetricCardsProps) => {
  const metrics = useMemo(() => {
    const uniqueUsers = new Set(data.map(d => d.userId)).size;
    const uniqueDatasets = new Set(data.map(d => d.datasetId)).size;
    const totalAccesses = data.length;
    const avgDuration = data.reduce((sum, d) => sum + d.duration, 0) / data.length || 0;
    const sensitiveAccesses = data.filter(d => d.tags.includes('sensitive')).length;
    const recentAccesses = data.filter(d => 
      Date.now() - d.timestamp.getTime() < 24 * 60 * 60 * 1000
    ).length;

    return {
      uniqueUsers,
      uniqueDatasets,
      totalAccesses,
      avgDuration: Math.round(avgDuration / 60), // Convert to minutes
      sensitiveAccesses,
      recentAccesses
    };
  }, [data]);

  const cards = [
    {
      title: "Active Users",
      value: metrics.uniqueUsers,
      icon: Users,
      color: "text-info",
      bgColor: "bg-info/10",
      change: "+12%",
      changeType: "positive" as const
    },
    {
      title: "Datasets Accessed",
      value: metrics.uniqueDatasets,
      icon: Database,
      color: "text-success",
      bgColor: "bg-success/10",
      change: "+8%",
      changeType: "positive" as const
    },
    {
      title: "Total Accesses",
      value: metrics.totalAccesses,
      icon: Activity,
      color: "text-accent",
      bgColor: "bg-accent/10",
      change: "+15%",
      changeType: "positive" as const
    },
    {
      title: "Avg Duration",
      value: `${metrics.avgDuration}m`,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
      change: "-5%",
      changeType: "negative" as const
    },
    {
      title: "Recent Activity",
      value: metrics.recentAccesses,
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
      change: "+23%",
      changeType: "positive" as const
    },
    {
      title: "Sensitive Data",
      value: metrics.sensitiveAccesses,
      icon: Shield,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      change: "0%",
      changeType: "neutral" as const
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="shadow-elegant hover:shadow-glow transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {card.value}
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Badge 
                  variant={card.changeType === 'positive' ? 'default' : 
                    card.changeType === 'negative' ? 'destructive' : 'secondary'}
                  className="px-1 py-0"
                >
                  {card.change}
                </Badge>
                <span className="text-muted-foreground">from last week</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};