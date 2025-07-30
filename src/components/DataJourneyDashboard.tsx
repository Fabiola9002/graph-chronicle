import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AccessHeatmap } from "./visualizations/AccessHeatmap";
import { UserDatasetFlow } from "./visualizations/UserDatasetFlow";
import { TimelineChart } from "./visualizations/TimelineChart";
import { SankeyDiagram } from "./visualizations/SankeyDiagram";
import TimelineCollapsibleTree from "./visualizations/TimelineCollapsibleTree";
import { UserJourneyFlowNew } from "./visualizations/UserJourneyFlowNew";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { MetricCards } from "./MetricCards";
import { SearchPanel } from "./SearchPanel";
import { JourneyInsights } from "./JourneyInsights";
import { PlayCircle, Pause, SkipForward, SkipBack, Settings, Database, Users, Activity, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  const [bucketMultiplier, setBucketMultiplier] = useState(3);
  const [currentTime, setCurrentTime] = useState(0);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [userIdFilter, setUserIdFilter] = useState("");
  const [datasetIdFilter, setDatasetIdFilter] = useState("");
const [filters, setFilters] = useState({
    departments: [] as string[],
    datasetTypes: [] as string[],
    accessTypes: [] as string[],
    timeWindow: 'day' as 'second' | 'minute' | 'hour' | 'day' | 'week' | 'year'
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

  // Filter data based on current filters and date range
  const filteredData = useMemo(() => {
    return accessData.filter(access => {
      const dateMatch = (!startDate || access.timestamp >= startDate) && 
                       (!endDate || access.timestamp <= endDate);
      const searchMatch = !searchQuery || 
        access.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        access.datasetName.toLowerCase().includes(searchQuery.toLowerCase());
      const userMatch = !userIdFilter || access.userId.includes(userIdFilter);
      const datasetMatch = !datasetIdFilter || access.datasetId.includes(datasetIdFilter);
      
      return dateMatch && searchMatch && userMatch && datasetMatch;
    });
  }, [accessData, startDate, endDate, searchQuery, userIdFilter, datasetIdFilter]);

  // Generate bucket labels based on time unit and multiplier
  const bucketLabels = useMemo(() => {
    const labels = [];
    for (let i = 1; i <= bucketMultiplier; i++) {
      const value = i === 1 ? 1 : i;
      labels.push(`${value} ${filters.timeWindow}${value > 1 ? 's' : ''}`);
    }
    return labels;
  }, [bucketMultiplier, filters.timeWindow]);


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
              
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Timeline:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PP") : "Start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PP") : "End date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Time Unit:</span>
                  <Select value={filters.timeWindow} onValueChange={(v: any) => setFilters(prev => ({ ...prev, timeWindow: v }))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="second">Seconds</SelectItem>
                      <SelectItem value="minute">Minutes</SelectItem>
                      <SelectItem value="hour">Hours</SelectItem>
                      <SelectItem value="day">Days</SelectItem>
                      <SelectItem value="week">Weeks</SelectItem>
                      <SelectItem value="year">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Buckets:</span>
                  <Select value={bucketMultiplier.toString()} onValueChange={(v) => setBucketMultiplier(Number(v))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                        <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  {journeyPerspective === 'user-journey' ? (
                    <Input
                      placeholder="User ID"
                      value={userIdFilter}
                      onChange={(e) => setUserIdFilter(e.target.value)}
                      className="w-32"
                    />
                  ) : (
                    <Input
                      placeholder="Dataset ID"
                      value={datasetIdFilter}
                      onChange={(e) => setDatasetIdFilter(e.target.value)}
                      className="w-32"
                    />
                  )}
                </div>
              </div>
              
              {bucketLabels.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">Current buckets:</span>
                  <div className="flex gap-1">
                    {bucketLabels.map((label, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="h-[800px]">
              <UserJourneyFlowNew data={filteredData} perspective={journeyPerspective} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DataJourneyDashboard;