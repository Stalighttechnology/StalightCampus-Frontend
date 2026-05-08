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
import { Filter, AlertCircle } from "lucide-react";
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
});

const InternalMarks = () => {
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

  const chartData = useMemo(() => {
    const testNums = selectedIA === "all" ? [1, 2, 3] : [parseInt(selectedIA)];
    
    return {
      labels: filteredSubjects,
      datasets: testNums.map((testNum) => {
        const colors = {
          1: { start: "rgba(99, 102, 241, 0.9)", end: "rgba(99, 102, 241, 0.3)", border: "#6366f1" },
          2: { start: "rgba(6, 182, 212, 0.9)", end: "rgba(6, 182, 212, 0.3)", border: "#06b6d4" },
          3: { start: "rgba(16, 185, 129, 0.9)", end: "rgba(16, 185, 129, 0.3)", border: "#10b981" }
        };
        const color = colors[testNum as keyof typeof colors] || colors[1];

        return {
          label: `IA ${testNum}`,
          data: filteredSubjects.map(
            (subj) => {
              const test = marksData[subj].find((t) => t.test_number === testNum);
              if (!test || !test.max_mark) return 0;
              return (test.mark / test.max_mark) * 100;
            }
          ),
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return color.start;
            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, color.end);
            gradient.addColorStop(1, color.start);
            return gradient;
          },
          borderColor: color.border,
          borderWidth: 2,
          borderRadius: 10,
          hoverBackgroundColor: color.border,
          barThickness: selectedIA === "all" ? 18 : 50,
          maxBarThickness: 60,
        };
      }),
    };
  }, [filteredSubjects, marksData, selectedIA]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        align: 'end' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: {
            size: 12,
            weight: '500' as const,
            family: "'Inter', sans-serif",
          },
          color: theme === 'dark' ? "#9ca3af" : "#6b7280",
        },
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? "#1f2937" : "#ffffff",
        titleColor: theme === 'dark' ? "#f3f4f6" : "#111827",
        bodyColor: theme === 'dark' ? "#d1d5db" : "#374151",
        borderColor: theme === 'dark' ? "#374151" : "#e5e7eb",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        usePointStyle: true,
        callbacks: {
          label: (context: any) => {
            const index = context.dataIndex;
            const subj = filteredSubjects[index];
            const datasetLabel = context.dataset.label || '';
            const testNum = datasetLabel.split(' ')[1];
            const test = marksData[subj].find(t => t.test_number === parseInt(testNum));
            
            if (test) {
              return `${datasetLabel}: ${test.mark}/${test.max_mark} (${((test.mark / test.max_mark) * 100).toFixed(1)}%)`;
            }
            return `${datasetLabel}: No data`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        border: {
          display: false,
          dash: [4, 4],
        },
        ticks: {
          stepSize: 20,
          color: theme === 'dark' ? "#9ca3af" : "#6b7280",
          font: {
            size: 11,
            family: "'Inter', sans-serif",
          },
          callback: (value: any) => `${value}%`
        },
        grid: {
          color: theme === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
          drawTicks: false,
        },
      },
      x: {
        border: {
          display: false,
        },
        ticks: {
          color: theme === 'dark' ? "#9ca3af" : "#6b7280",
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 11,
            family: "'Inter', sans-serif",
          },
        },
        grid: {
          display: false,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    animation: {
      duration: 2000,
      easing: 'easeOutQuart' as const,
    }
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
    const errorMessage = error instanceof Error ? error.message : "There was an error loading your internal marks data.";
    const isRestricted = errorMessage.toLowerCase().includes("restricted");

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <div className={`p-4 rounded-full mb-4 ${isRestricted ? "bg-amber-100 text-amber-600" : "bg-destructive/10 text-destructive"}`}>
          <AlertCircle className="h-10 w-10" />
        </div>
        <h3 className="text-xl font-bold mb-2">{isRestricted ? "Access Restricted" : "Error Loading Data"}</h3>
        <p className={`max-w-md mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-muted-foreground'}`}>
          {errorMessage}
        </p>
        <Button 
          onClick={() => window.location.reload()}
          variant="outline"
          className={theme === 'dark' ? 'border-gray-700 hover:bg-gray-800' : ''}
        >
          {isRestricted ? "Contact Admin" : "Try Again"}
        </Button>
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
        <CardContent className={`p-0 sm:p-6 ${theme === 'dark' ? 'bg-card text-card-foreground' : 'bg-white text-gray-900'}`}>
          {filteredSubjects.length === 0 ? (
            <div className="h-[350px] flex flex-col items-center justify-center space-y-4">
              <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">No subjects to display</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or search query</p>
              </div>
            </div>
          ) : (
            <div className="w-full overflow-x-auto custom-scrollbar-premium pb-4 px-4 sm:px-0">
              <div 
                style={{ 
                  minWidth: `${Math.max(100, filteredSubjects.length * (selectedIA === "all" ? 160 : 120))}px`, 
                  height: '300px',
                  width: '60%' 
                }}
                className="mt-4 mx-auto"
              >
                <MemoizedBarChart data={chartData} options={chartOptions} />
              </div>
            </div>
          )}
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