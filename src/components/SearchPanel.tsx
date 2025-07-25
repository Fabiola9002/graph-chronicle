import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatasetAccess } from "./DataJourneyDashboard";
import { Search, Filter, X } from "lucide-react";
import { useMemo } from "react";

interface SearchPanelProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: {
    departments: string[];
    datasetTypes: string[];
    accessTypes: string[];
    timeWindow: 'hour' | 'day' | 'week' | 'month';
  };
  onFiltersChange: (filters: any) => void;
  data: DatasetAccess[];
}

export const SearchPanel = ({ 
  searchQuery, 
  onSearchChange, 
  filters, 
  onFiltersChange,
  data 
}: SearchPanelProps) => {
  const filterOptions = useMemo(() => {
    const departments = [...new Set(data.map(d => d.department))];
    const datasetTypes = [...new Set(data.map(d => d.datasetType))];
    const accessTypes = [...new Set(data.map(d => d.accessType))];
    
    return { departments, datasetTypes, accessTypes };
  }, [data]);

  const handleFilterChange = (category: string, value: string, checked: boolean) => {
    const newFilters = { ...filters };
    if (category === 'departments') {
      newFilters.departments = checked 
        ? [...filters.departments, value]
        : filters.departments.filter(v => v !== value);
    } else if (category === 'datasetTypes') {
      newFilters.datasetTypes = checked 
        ? [...filters.datasetTypes, value]
        : filters.datasetTypes.filter(v => v !== value);
    } else if (category === 'accessTypes') {
      newFilters.accessTypes = checked 
        ? [...filters.accessTypes, value]
        : filters.accessTypes.filter(v => v !== value);
    }
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({
      departments: [],
      datasetTypes: [],
      accessTypes: [],
      timeWindow: 'day'
    });
  };

  const activeFilterCount = filters.departments.length + filters.datasetTypes.length + filters.accessTypes.length;

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-accent" />
            Search & Filter
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4" />
              Clear ({activeFilterCount})
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Users or Datasets</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Enter user name or dataset..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Time Window */}
        <div className="space-y-2">
          <Label>Time Window</Label>
          <Select
            value={filters.timeWindow}
            onValueChange={(value) => onFiltersChange({ ...filters, timeWindow: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hour">Last Hour</SelectItem>
              <SelectItem value="day">Last Day</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Department Filter */}
        <div className="space-y-2">
          <Label>Departments</Label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {filterOptions.departments.map(dept => (
              <div key={dept} className="flex items-center space-x-2">
                <Checkbox
                  id={`dept-${dept}`}
                  checked={filters.departments.includes(dept)}
                  onCheckedChange={(checked) => 
                    handleFilterChange('departments', dept, checked as boolean)
                  }
                />
                <Label htmlFor={`dept-${dept}`} className="text-sm cursor-pointer">
                  {dept}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Dataset Type Filter */}
        <div className="space-y-2">
          <Label>Dataset Types</Label>
          <div className="flex flex-wrap gap-1">
            {filterOptions.datasetTypes.map(type => (
              <Badge
                key={type}
                variant={filters.datasetTypes.includes(type) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => 
                  handleFilterChange('datasetTypes', type, !filters.datasetTypes.includes(type))
                }
              >
                {type}
              </Badge>
            ))}
          </div>
        </div>

        {/* Access Type Filter */}
        <div className="space-y-2">
          <Label>Access Types</Label>
          <div className="flex flex-wrap gap-1">
            {filterOptions.accessTypes.map(type => (
              <Badge
                key={type}
                variant={filters.accessTypes.includes(type) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => 
                  handleFilterChange('accessTypes', type, !filters.accessTypes.includes(type))
                }
              >
                {type}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};