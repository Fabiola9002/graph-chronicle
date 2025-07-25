import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Journey } from "./DataJourneyDashboard";
import { Brain, ArrowRight, Users, Clock, TrendingUp, Sparkles } from "lucide-react";
import { useState } from "react";

interface JourneyInsightsProps {
  insights: Journey[];
  loading: boolean;
  onDiscoverSimilar: (path: string[]) => void;
}

export const JourneyInsights = ({ insights, loading, onDiscoverSimilar }: JourneyInsightsProps) => {
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [apiKey, setApiKey] = useState("");

  const handleDiscover = () => {
    if (!selectedPath.trim()) return;
    const pathArray = selectedPath.split(',').map(s => s.trim()).filter(Boolean);
    onDiscoverSimilar(pathArray);
  };

  return (
    <div className="space-y-4">
      {/* LLM Insights Input */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-accent" />
            AI Journey Discovery
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">Perplexity API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your API key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Connect to Supabase for secure key storage
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="path">Data Journey Path</Label>
            <Input
              id="path"
              placeholder="dataset1, dataset2, dataset3"
              value={selectedPath}
              onChange={(e) => setSelectedPath(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter comma-separated dataset names
            </p>
          </div>
          
          <Button 
            onClick={handleDiscover}
            disabled={loading || !selectedPath.trim() || !apiKey.trim()}
            className="w-full"
            size="sm"
          >
            {loading ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                Discovering...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Find Similar Journeys
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Insights Results */}
      {insights.length > 0 && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Discovered Journeys
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {insights.map((insight, index) => (
              <div key={insight.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    Journey {index + 1}
                  </Badge>
                  <Badge 
                    variant={insight.confidence > 0.8 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {Math.round(insight.confidence * 100)}% confidence
                  </Badge>
                </div>
                
                <div className="flex items-center gap-1 text-sm overflow-x-auto">
                  {insight.path.map((dataset, i) => (
                    <div key={i} className="flex items-center gap-1 whitespace-nowrap">
                      <span className="font-medium text-foreground">{dataset}</span>
                      {i < insight.path.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-accent" />
                    <span className="text-muted-foreground">Freq:</span>
                    <span className="font-medium">{insight.frequency}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-info" />
                    <span className="text-muted-foreground">Users:</span>
                    <span className="font-medium">{insight.userCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-warning" />
                    <span className="text-muted-foreground">Avg:</span>
                    <span className="font-medium">{Math.round(insight.avgDuration / 60)}m</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};