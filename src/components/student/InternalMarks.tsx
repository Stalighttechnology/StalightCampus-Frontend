import React, { useMemo, useState, memo, useRef , useEffect} from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Checkbox } from "../ui/checkbox";
import { Bar } from "react-chartjs-2";
import {
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Filter } from "lucide-react";
import { useStudentInternalMarksQuery } from "@/hooks/useApiQueries";
import { useMemoizedCalculation } from "@/hooks/useOptimizations";
import { useTheme } from "@/context/ThemeContext";
import { useVirtualizer } from '@tanstack/react-virtual';
import { SkeletonChart, SkeletonTable, Skeleton } from "../ui/skeleton";
import { useDebouncedSearch } from "@/hooks/useOptimizations";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Memoized Table Row Component
const MemoizedTableRow = React.memo(({ 
  subject, 
  tests, 
  theme,
  index 
}: { 
  subject: string, 
  tests: SubjectMarks[], 
  theme: string,
  index: number 
}) => {
  const t1 = tests.find((t) => t.test_number === 1)?.mark ?? null;
  const t2 = tests.find((t) => t.test_number === 2)?.mark ?? null;
  const ia1 = tests.find((t) => t.test_number === 3)?.mark ?? null;
  const ia2 = tests.find((t) => t.test_number === 4)?.mark ?? null;
  const ia3 = tests.find((t) => t.test_number === 5)?.mark ?? null;
  
  // Calculate average using memoized calculation
  const avg = useMemoizedCalculation(() => {
    const availableMarks = [t1, t2, ia1, ia2, ia3].filter(mark => mark !== null && mark !== undefined);
    return availableMarks.length > 0 
      ? availableMarks.reduce((sum, mark) => sum + mark, 0) / availableMarks.length 
      : 0;
  }, [t1, t2, ia1, ia2, ia3]);

  return (
    <div
      className={`grid grid-cols-7 p-3 text-sm ${theme === 'dark' ? 'text-card-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}`}
    >
      <div>{subject}</div>
      <div className="text-center">{t1 !== null ? t1 : "-"}</div>
      <div className="text-center">{t2 !== null ? t2 : "-"}</div>
      <div className="text-center">{ia1 !== null ? ia1 : "-"}</div>
      <div className="text-center">{ia2 !== null ? ia2 : "-"}</div>
      <div className="text-center">{ia3 !== null ? ia3 : "-"}</div>
      <div className="text-center font-semibold">
        {avg > 0 ? avg.toFixed(1) : "-"}
      </div>
    </div>
  );
});

interface SubjectMarks {
  test_number: number;
  mark: number;
  max_mark: number;
}

// Memoized Bar Chart Component
const MemoizedBarChart = React.memo(({ data, options }: { data: any; options: any }) => {
  return <Bar data={data} options={options} />;
});

// Virtualized Table Component
const VirtualizedMarksTable = memo(({ filteredSubjects, marksData, theme }: {
  filteredSubjects: string[];
  marksData: { [subject: string]: SubjectMarks[] };
  theme: string;
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Pre-calculate all averages to avoid hooks in map
  const subjectAverages = useMemo(() => {
    const averages: { [subject: string]: number } = {};
    
    filteredSubjects.forEach(subject => {
      const tests = marksData[subject] || [];
      const ia1 = tests.find((t) => t.test_number === 1)?.mark ?? null;
      const ia2 = tests.find((t) => t.test_number === 2)?.mark ?? null;
      const ia3 = tests.find((t) => t.test_number === 3)?.mark ?? null;
      
      const availableMarks = [ia1, ia2, ia3].filter(mark => mark !== null && mark !== undefined);
      averages[subject] = availableMarks.length > 0 
        ? availableMarks.reduce((sum, mark) => sum + mark, 0) / availableMarks.length 
        : 0;
    });
    
    return averages;
  }, [filteredSubjects, marksData]);

  const virtualizer = useVirtualizer({
    count: filteredSubjects.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className={`h-96 overflow-auto ${theme === 'dark' ? 'bg-card' : 'bg-white'}`}
      style={{ contain: 'strict' }}
    >
      {/* Fixed Header */}
      <div className={`sticky top-0 z-10 border-b ${theme === 'dark' ? 'border-gray-300 bg-card' : 'border-gray-200 bg-white'}`}>
        <div className={`grid grid-cols-4 p-3 font-medium text-sm ${theme === 'dark' ? 'bg-card text-card-foreground' : 'bg-white text-gray-900'}`}>
          <div>Subject</div>
          <div className="text-center">IA 1</div>
          <div className="text-center">IA 2</div>
          <div className="text-center">IA 3</div>
          <div className="text-center">Average</div>
        </div>
      </div>

      {/* Virtualized Rows */}
      <div 
        style={{ 
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const subject = filteredSubjects[virtualItem.index];
          const tests = marksData[subject] || [];
          
          const ia1 = tests.find((t) => t.test_number === 1)?.mark ?? null;
          const ia2 = tests.find((t) => t.test_number === 2)?.mark ?? null;
          const ia3 = tests.find((t) => t.test_number === 3)?.mark ?? null;
          
          // Use pre-calculated average
          const avg = subjectAverages[subject] || 0;

          return (
            <div
              key={virtualItem.key}
              className={`grid grid-cols-4 p-3 text-sm border-b ${theme === 'dark' ? 'border-gray-300 text-card-foreground hover:bg-accent' : 'border-gray-200 text-gray-900 hover:bg-gray-50'}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="truncate">{subject}</div>
              <div className="text-center">{ia1 !== null ? ia1 : "-"}</div>
              <div className="text-center">{ia2 !== null ? ia2 : "-"}</div>
              <div className="text-center">{ia3 !== null ? ia3 : "-"}</div>
              <div className="text-center font-semibold">
                {avg > 0 ? avg.toFixed(1) : "-"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});const InternalMarks = () => {
  const { theme } = useTheme();
  const { data: marksResponse, isLoading, error, pagination } = useStudentInternalMarksQuery();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedIA, setSelectedIA] = useState<string>("all");
  const [showFilter, setShowFilter] = useState(false);
  
  // Use debounced search
  const { value: searchQuery, debouncedValue: debouncedSearchQuery, setValue: setSearchQuery, isDebouncing } = useDebouncedSearch('', 500);

  // Transform marks data from response
  const marksData = useMemo(() => {
    if (!marksResponse?.data) return {};

    const groupedData: { [subject: string]: SubjectMarks[] } = {};

    // Process all marks (internal and IA are now combined)
    marksResponse.data?.forEach(mark => {
      const subjectName = mark.subject;
      if (!groupedData[subjectName]) {
        groupedData[subjectName] = [];
      }
      groupedData[subjectName].push({
        test_number: mark.test_number,
        mark: mark.mark,
        max_mark: mark.max_mark
      });
    });

    return groupedData;
  }, [marksResponse?.data]);

  const allSubjects = Object.keys(marksData);
  const filteredSubjects = allSubjects.filter(
    (subject) => {
      const subjectMatches = (selectedSubjects.length === 0 || selectedSubjects.includes(subject)) &&
        subject.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      
      if (selectedIA === "all") {
        return subjectMatches;
      }
      
      const tests = marksData[subject] || [];
      const iaNumber = parseInt(selectedIA);
      const hasMarkInIA = tests.some(t => t.test_number === iaNumber && t.mark !== null && t.mark !== undefined);
      
      return subjectMatches && hasMarkInIA;
    }
  );

  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: filteredSubjects.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 5,
  });

  // Pre-calculate all averages to avoid hooks in map
  const subjectAverages = useMemo(() => {
    const averages: { [subject: string]: number } = {};
    
    filteredSubjects.forEach(subject => {
      const tests = marksData[subject] || [];
      const ia1 = tests.find((t) => t.test_number === 1)?.mark ?? null;
      const ia2 = tests.find((t) => t.test_number === 2)?.mark ?? null;
      const ia3 = tests.find((t) => t.test_number === 3)?.mark ?? null;
      
      const availableMarks = [ia1, ia2, ia3].filter(mark => mark !== null && mark !== undefined);
      averages[subject] = availableMarks.length > 0 
        ? availableMarks.reduce((sum, mark) => sum + mark, 0) / availableMarks.length 
        : 0;
    });
    
    return averages;
  }, [filteredSubjects, marksData]);

  const chartData = useMemo(() => ({
    labels: filteredSubjects,
    datasets: [1, 2, 3].map((testNum) => ({
      label: `IA ${testNum}`,
      data: filteredSubjects.map(
        (subj) =>
          marksData[subj].find((t) => t.test_number === testNum)?.mark ?? 0
      ),
      backgroundColor: testNum === 1 ? "#3b82f6" : testNum === 2 ? "#06b6d4" : "#10b981",
    })),
  }), [filteredSubjects, marksData]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: theme === 'dark' ? "#9ca3af" : "#6b7280",
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          color: theme === 'dark' ? "#9ca3af" : "#6b7280"
        },
        grid: {
          color: theme === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.1)",
        },
      },
      x: {
        ticks: {
          color: theme === 'dark' ? "#9ca3af" : "#6b7280"
        },
        grid: {
          color: theme === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.1)",
        },
      },
    },
  }), [theme]);

  if (isLoading) {
    return (
      <div className={`min-h-screen w-full overflow-x-hidden space-y-4 px-4 sm:px-0 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
        {/* Chart Section */}
        <Card className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <CardHeader className={theme === 'dark' ? 'bg-card text-card-foreground border-b border-border' : 'bg-white text-gray-900 border-b border-gray-200'}>
            <CardTitle className={theme === 'dark' ? 'text-sm sm:text-base text-card-foreground' : 'text-sm sm:text-base text-gray-900'}> Performance Overview</CardTitle>
          </CardHeader>
          <CardContent className={theme === 'dark' ? 'bg-card text-card-foreground' : 'bg-white text-gray-900'}>
            <div className="flex items-center justify-center h-[200px] sm:h-[300px]">
              <div className="w-full max-w-full sm:max-w-[600px] h-[160px] sm:h-[250px]">
                <SkeletonChart />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter Row */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between">
          <Skeleton className="h-10 w-full sm:w-72" />
          <Skeleton className="h-10 w-full sm:w-20" />
        </div>

        {/* Table */}
        <div className={`rounded-md overflow-hidden ${theme === 'dark' ? 'border-border bg-card text-card-foreground' : 'border-gray-200 bg-white text-gray-900'}`}>
          <SkeletonTable rows={8} cols={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="text-red-500">Error loading internal marks data</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full overflow-x-hidden space-y-4 px-4 sm:px-0 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Chart Section */}
     <Card className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader className={theme === 'dark' ? 'bg-card text-card-foreground border-b border-border' : 'bg-white text-gray-900 border-b border-gray-200'}>
          <CardTitle className={`text-lg sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}> Performance Overview</CardTitle>
        </CardHeader>
        <CardContent className={theme === 'dark' ? 'bg-card text-card-foreground' : 'bg-white text-gray-900'}>
          <div className="flex items-center justify-center h-[200px] sm:h-[300px]">
            <div className="w-full max-w-full sm:max-w-[600px] h-[160px] sm:h-[250px]">
              <MemoizedBarChart data={chartData} options={chartOptions} />
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-0 sm:justify-between">
        {/* Search Input */}
        <div className="relative w-full sm:w-auto">
          <Input
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={theme === 'dark' ? 'w-full sm:w-72 bg-background text-foreground border-border focus:border-foreground focus:ring-0 rounded-md placeholder:text-muted-foreground text-sm' : 'w-full sm:w-72 bg-white text-gray-900 border-gray-300 focus:border-gray-500 focus:ring-0 rounded-md placeholder:text-gray-500 text-sm'}
          />
          {isDebouncing && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-muted-foreground/20 border-t-muted-foreground rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Filter Button */}
        <Button
          variant="outline"
          className={theme === 'dark' ? 'w-full sm:w-auto text-foreground bg-muted hover:bg-accent border-border' : 'w-full sm:w-auto text-gray-700 bg-white hover:bg-gray-100 border-gray-300'}
          onClick={() => setShowFilter(true)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Table */}
      <div className={`rounded-md overflow-hidden w-full ${theme === 'dark' ? 'border-border bg-card text-card-foreground' : 'border-gray-200 bg-white text-gray-900'}`}>
        {filteredSubjects.length === 0 ? (
          <div className={`h-96 flex items-center justify-center ${theme === 'dark' ? 'bg-card' : 'bg-white'}`}>
            <div className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <p className="text-sm font-medium">No subjects found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          </div>
        ) : (
          <div
            ref={parentRef}
            className={`h-96 overflow-x-auto w-full ${theme === 'dark' ? 'bg-card' : 'bg-white'}`}
            style={{ contain: 'strict' }}
          >
            {/* Fixed Header */}
            <div className={`sticky top-0 z-10 border-b ${theme === 'dark' ? 'border-gray-300 bg-card' : 'border-gray-200 bg-white'}`}>
              <div className={`grid ${selectedIA === 'all' ? 'grid-cols-5' : 'grid-cols-3'} p-2 sm:p-3 font-medium text-xs sm:text-sm ${theme === 'dark' ? 'bg-card text-card-foreground' : 'bg-white text-gray-900'}`}>
                <div>Subject</div>
                {selectedIA === 'all' ? (
                  <>
                    <div className="text-center">IA 1</div>
                    <div className="text-center">IA 2</div>
                    <div className="text-center">IA 3</div>
                  </>
                ) : (
                  <div className="text-center">IA {selectedIA}</div>
                )}
                <div className="text-center">Average</div>
              </div>
            </div>

            {/* Virtualized Rows */}
            <div 
              style={{ 
                height: `${virtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const subject = filteredSubjects[virtualItem.index];
                const tests = marksData[subject] || [];
                
                const ia1 = tests.find((t) => t.test_number === 1)?.mark ?? null;
                const ia2 = tests.find((t) => t.test_number === 2)?.mark ?? null;
                const ia3 = tests.find((t) => t.test_number === 3)?.mark ?? null;
                
                // Use pre-calculated average
                const avg = subjectAverages[subject] || 0;
                
                // Get the selected IA value
                const selectedIAValue = selectedIA === 'all' ? null : parseInt(selectedIA);
                const selectedIAMark = selectedIAValue ? tests.find((t) => t.test_number === selectedIAValue)?.mark ?? null : null;

                return (
                  <div
                    key={virtualItem.key}
                    className={`grid ${selectedIA === 'all' ? 'grid-cols-5' : 'grid-cols-3'} p-2 sm:p-3 text-xs sm:text-sm border-b ${theme === 'dark' ? 'border-gray-300 text-card-foreground hover:bg-accent' : 'border-gray-200 text-gray-900 hover:bg-gray-50'}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <div className="break-words">{subject}</div>
                    {selectedIA === 'all' ? (
                      <>
                        <div className="text-center">{ia1 !== null ? ia1 : "-"}</div>
                        <div className="text-center">{ia2 !== null ? ia2 : "-"}</div>
                        <div className="text-center">{ia3 !== null ? ia3 : "-"}</div>
                      </>
                    ) : (
                      <div className="text-center">{selectedIAMark !== null ? selectedIAMark : "-"}</div>
                    )}
                    <div className="text-center font-semibold">
                      {avg > 0 ? avg.toFixed(1) : "-"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filter Dialog */}
      <Dialog open={showFilter} onOpenChange={setShowFilter}>
        <DialogContent className={`w-[90%] sm:w-[80%] md:w-auto md:max-w-2xl lg:max-w-4xl mx-auto rounded-lg ${theme === 'dark' ? 'bg-[#1c1c1e] text-gray-200 border-gray-700' : 'bg-white text-gray-900 border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className={`text-base sm:text-lg font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
              Filter by Subject
            </DialogTitle>
          </DialogHeader>

          {/* Filters Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Subject Filter */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>Subject</label>
              <Select
                value={selectedSubjects.length ? selectedSubjects[0] : "All"}
                onValueChange={(value) => {
                  if (value === "All") {
                    setSelectedSubjects([]); // Show all subjects
                  } else {
                    setSelectedSubjects([value]);
                  }
                }}
              >
                <SelectTrigger className={theme === 'dark' ? 'w-full bg-[#232326] text-gray-200 border-gray-600 text-sm' : 'w-full bg-white text-gray-900 border-gray-300 text-sm'}>
                  <SelectValue placeholder="Choose a Subject" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-[#1c1c1e] text-gray-200 border-gray-700 text-sm' : 'bg-white text-gray-900 border-gray-200 text-sm'}>
                  {/* "All" Option */}
                  <SelectItem
                    value="All"
                    className={theme === 'dark' ? 'hover:bg-[#2c2c2e] cursor-pointer font-semibold text-xs sm:text-sm' : 'hover:bg-gray-100 cursor-pointer font-semibold text-xs sm:text-sm'}
                  >
                    All Subjects
                  </SelectItem>

                  {/* Subject List */}
                  {allSubjects.map((subject) => (
                    <SelectItem
                      key={subject}
                      value={subject}
                      className={theme === 'dark' ? 'hover:bg-[#2c2c2e] cursor-pointer text-xs sm:text-sm' : 'hover:bg-gray-100 cursor-pointer text-xs sm:text-sm'}
                    >
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* IA Filter */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>Filter by IA</label>
              <Select value={selectedIA} onValueChange={setSelectedIA}>
                <SelectTrigger className={theme === 'dark' ? 'w-full bg-[#232326] text-gray-200 border-gray-600 text-sm' : 'w-full bg-white text-gray-900 border-gray-300 text-sm'}>
                  <SelectValue placeholder="Select IA" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-[#1c1c1e] text-gray-200 border-gray-700 text-sm' : 'bg-white text-gray-900 border-gray-200 text-sm'}>
                  <SelectItem value="all" className={theme === 'dark' ? 'hover:bg-[#2c2c2e] cursor-pointer text-xs sm:text-sm' : 'hover:bg-gray-100 cursor-pointer text-xs sm:text-sm'}>
                    All IAs
                  </SelectItem>
                  <SelectItem value="1" className={theme === 'dark' ? 'hover:bg-[#2c2c2e] cursor-pointer text-xs sm:text-sm' : 'hover:bg-gray-100 cursor-pointer text-xs sm:text-sm'}>
                    IA 1
                  </SelectItem>
                  <SelectItem value="2" className={theme === 'dark' ? 'hover:bg-[#2c2c2e] cursor-pointer text-xs sm:text-sm' : 'hover:bg-gray-100 cursor-pointer text-xs sm:text-sm'}>
                    IA 2
                  </SelectItem>
                  <SelectItem value="3" className={theme === 'dark' ? 'hover:bg-[#2c2c2e] cursor-pointer text-xs sm:text-sm' : 'hover:bg-gray-100 cursor-pointer text-xs sm:text-sm'}>
                    IA 3
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              className={theme === 'dark' ? 'w-full sm:w-auto bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-200 text-sm' : 'w-full sm:w-auto bg-gray-200 hover:bg-gray-300 border-gray-300 text-gray-700 text-sm'}
              onClick={() => {
                setSelectedSubjects([]);
                setSelectedIA("all");
                setSearchQuery("");
                setShowFilter(false);
              }}
            >
              Clear
            </Button>
            <Button 
              className="w-full sm:w-auto text-white bg-primary hover:bg-primary/90 border-primary text-sm"
              onClick={() => setShowFilter(false)}
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InternalMarks;