import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { AccessHeatmap } from "./visualizations/AccessHeatmap";
import { UserDatasetFlow } from "./visualizations/UserDatasetFlow";
import { TimelineChart } from "./visualizations/TimelineChart";
import { SankeyDiagram } from "./visualizations/SankeyDiagram";
import TimelineCollapsibleTree from "./visualizations/TimelineCollapsibleTree";
import { UserJourneyFlow } from "./visualizations/UserJourneyFlow";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { MetricCards } from "./MetricCards";
import { SearchPanel } from "./SearchPanel";
import { JourneyInsights } from "./JourneyInsights";
import { PlayCircle, Pause, SkipForward, SkipBack, Settings, Database, Users, Activity } from "lucide-react";
import { toast } from "sonner";

// Mock data types
export interface DatasetAccess {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  datasetId: string;
  datasetName: string;
  datasetType: 'table' | 'file' | 'api' | 'stream';
  accessType: 'read' | 'write' | 'execute';
  timestamp: Date;
  duration: number;
  recordsAccessed: number;
  department: string;
  tags: string[];
}

export interface Journey {
  id: string;
  path: string[];
  frequency: number;
  avgDuration: number;
  userCount: number;
  startDataset: string;
  endDataset: string;
  confidence: number;
}

const DataJourneyDashboard = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRange, setTimeRange] = useState([0, 100]);
  const [selectedVisualization, setSelectedVisualization] = useState("journey");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
const [filters, setFilters] = useState({
    departments: [] as string[],
    datasetTypes: [] as string[],
    accessTypes: [] as string[],
    timeWindow: 'day' as 'hour' | 'day' | 'week' | 'month'
  });
  const [treeHierarchy, setTreeHierarchy] = useState<'dataset-orgs-users' | 'user-platform-dataset'>('dataset-orgs-users');
  const [journeyPerspective, setJourneyPerspective] = useState<'user-journey' | 'dataset-journey'>('user-journey');

  // Mock data generation
  const generateMockData = (): DatasetAccess[] => {
    const users = ['alice.johnson', 'bob.smith', 'carol.davis', 'david.brown', 'emma.wilson'];
    const datasets = ['customer_data', 'sales_reports', 'inventory_db', 'analytics_warehouse', 'user_profiles'];
    const departments = ['Engineering', 'Analytics', 'Sales', 'Marketing', 'Operations'];
    const roles = ['Data Scientist', 'Analyst', 'Engineer', 'Manager', 'Developer'];
    
    return Array.from({ length: 500 }, (_, i) => ({
      id: `access_${i}`,
      userId: `user_${Math.floor(Math.random() * users.length)}`,
      userName: users[Math.floor(Math.random() * users.length)],
      userRole: roles[Math.floor(Math.random() * roles.length)],
      datasetId: `dataset_${Math.floor(Math.random() * datasets.length)}`,
      datasetName: datasets[Math.floor(Math.random() * datasets.length)],
      datasetType: ['table', 'file', 'api', 'stream'][Math.floor(Math.random() * 4)] as any,
      accessType: ['read', 'write', 'execute'][Math.floor(Math.random() * 3)] as any,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      duration: Math.floor(Math.random() * 3600) + 60,
      recordsAccessed: Math.floor(Math.random() * 10000) + 1,
      department: departments[Math.floor(Math.random() * departments.length)],
      tags: ['sensitive', 'public', 'internal', 'experimental'].filter(() => Math.random() > 0.7)
    }));
  };

  const [accessData, setAccessData] = useState<DatasetAccess[]>([]);
  const [insights, setInsights] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAccessData(generateMockData());
  }, []);

  // Filter data based on current filters and time range
  const filteredData = useMemo(() => {
    return accessData.filter(access => {
      const timeMatch = currentTime === 0 || access.timestamp.getTime() <= Date.now() - (100 - currentTime) * 24 * 60 * 60 * 1000;
      const searchMatch = !searchQuery || 
        access.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        access.datasetName.toLowerCase().includes(searchQuery.toLowerCase());
      
      return timeMatch && searchMatch;
    });
  }, [accessData, currentTime, searchQuery]);

  // Playback control
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        if (prev >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return prev + (playbackSpeed * 0.5);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    toast(isPlaying ? "Playback paused" : "Playback started");
  };

  const handleReset = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    toast("Timeline reset to beginning");
  };

  const handleJourneyInsight = async (selectedPath: string[]) => {
    setLoading(true);
    try {
      // Simulate LLM API call for finding similar journeys
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockInsights: Journey[] = [
        {
          id: 'journey_1',
          path: ['customer_data', 'analytics_warehouse', 'sales_reports'],
          frequency: 25,
          avgDuration: 1800,
          userCount: 8,
          startDataset: 'customer_data',
          endDataset: 'sales_reports',
          confidence: 0.85
        },
        {
          id: 'journey_2',
          path: ['user_profiles', 'customer_data', 'inventory_db'],
          frequency: 15,
          avgDuration: 2400,
          userCount: 5,
          startDataset: 'user_profiles',
          endDataset: 'inventory_db',
          confidence: 0.72
        }
      ];
      
      setInsights(mockInsights);
      toast("Similar data journeys discovered!");
    } catch (error) {
      toast("Failed to find insights. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Data Journey Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Explore user access patterns and discover data flow insights
            </p>
          </div>
          
          {/* Playback Controls */}
          <div className="flex items-center gap-4 bg-card p-4 rounded-lg shadow-elegant">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-8"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              variant={isPlaying ? "secondary" : "default"}
              size="sm"
              onClick={handlePlayPause}
              className="h-8 w-16"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
            </Button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Speed:</span>
              <Select value={playbackSpeed.toString()} onValueChange={(v) => setPlaybackSpeed(Number(v))}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="5">5x</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Metrics Overview */}
        <MetricCards data={filteredData} />

        {/* Main Content - Full Width Journey Visualization */}
        <div className="grid grid-cols-1">
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-accent" />
                  Data Access Visualization
                </CardTitle>
                
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Perspective:</span>
                  <Select value={journeyPerspective} onValueChange={(v: any) => setJourneyPerspective(v)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user-journey">User Journey</SelectItem>
                      <SelectItem value="dataset-journey">Dataset Journey</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Timeline:</span>
                <div className="flex-1">
                  <Slider
                    value={[currentTime]}
                    onValueChange={([value]) => setCurrentTime(value)}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
                <span className="text-sm text-muted-foreground">
                  {Math.round(currentTime)}%
                </span>
              </div>
            </CardHeader>
            
            <CardContent className="h-[800px]">
              <UserJourneyFlow data={filteredData} perspective={journeyPerspective} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DataJourneyDashboard;