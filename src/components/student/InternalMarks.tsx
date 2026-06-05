import React, { useMemo, useState, memo, useRef, useEffect } from "react";
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



  // Pre-calculate all averages to avoid hooks in map
  const subjectAverages = useMemo(() => {
    const averages: { [subject: string]: number } = {};

    filteredSubjects.forEach(subject => {
      const tests = marksData[subject] || [];
      const iaMarks = [1, 2, 3, 4, 5].map(num => tests.find((t) => t.test_number === num)?.mark ?? null);

      const availableMarks = iaMarks.filter(mark => mark !== null && mark !== undefined);
      averages[subject] = availableMarks.length > 0
        ? availableMarks.reduce((sum, mark) => sum + (mark as number), 0) / availableMarks.length
        : 0;
    });

    return averages;
  }, [filteredSubjects, marksData]);

  const chartData = useMemo(() => {
    const testNums = selectedIA === "all" ? [1, 2, 3, 4, 5] : [parseInt(selectedIA)];

    return {
      labels: filteredSubjects,
      datasets: testNums.map((testNum) => {
        const colors = {
          1: { start: "rgba(99, 102, 241, 0.9)", end: "rgba(99, 102, 241, 0.3)", border: "#6366f1" },
          2: { start: "rgba(6, 182, 212, 0.9)", end: "rgba(6, 182, 212, 0.3)", border: "#06b6d4" },
          3: { start: "rgba(16, 185, 129, 0.9)", end: "rgba(16, 185, 129, 0.3)", border: "#10b981" },
          4: { start: "rgba(245, 158, 11, 0.9)", end: "rgba(245, 158, 11, 0.3)", border: "#f59e0b" },
          5: { start: "rgba(236, 72, 153, 0.9)", end: "rgba(236, 72, 153, 0.3)", border: "#ec4899" }
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
          borderRadius: 8,
          hoverBackgroundColor: theme === 'dark' ? '#fff' : color.border,
          hoverBorderColor: theme === 'dark' ? color.border : '#000',
          hoverBorderWidth: 2,
          barThickness: selectedIA === "all" ? 18 : 50,
          maxBarThickness: 60,
        };
      }),
    };
  }, [filteredSubjects, marksData, selectedIA, theme]);

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
            weight: '600' as const,
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
        cornerRadius: 12,
        displayColors: true,
        usePointStyle: true,
        boxPadding: 6,
        callbacks: {
          label: (context: any) => {
            const index = context.dataIndex;
            const subj = filteredSubjects[index];
            const datasetLabel = context.dataset.label || '';
            const testNum = datasetLabel.split(' ')[1];
            const test = marksData[subj]?.find(t => t.test_number === parseInt(testNum));

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
            weight: '500' as const
          },
        },
        grid: {
          display: false,
        },
      },
    },
    interaction: {
      intersect: true,
      mode: 'nearest' as const,
      axis: 'xy' as const
    },
    hover: {
      mode: 'nearest' as const,
      intersect: true
    },
    animation: {
      duration: 1500,
      easing: 'easeOutQuart' as const,
    }
  }), [theme, filteredSubjects, marksData]);

  if (isLoading) {
    return (
      <div>
        {/* Chart Section */}
        <Card id="marks-overview-card" className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <CardHeader id="marks-overview-card-header" className={theme === 'dark' ? 'bg-card text-card-foreground border-b border-border' : 'bg-white text-gray-900 border-b border-gray-200'}>
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
        <div id="marks-table-card" className={`rounded-md overflow-hidden ${theme === 'dark' ? 'border-border bg-card text-card-foreground' : 'border-gray-200 bg-white text-gray-900'}`}>
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
        <h3 className="text-xl font-semibold mb-2">{isRestricted ? "Access Restricted" : "Error Loading Data"}</h3>
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
    <div className={`min-h-screen w-full overflow-x-hidden space-y-4`}>
      {/* Chart Section */}
      <Card id="marks-overview-card" className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader id="marks-overview-card-header" className={theme === 'dark' ? 'bg-card text-card-foreground border-b border-border' : 'bg-white text-gray-900 border-b border-gray-200'}>
          <CardTitle className={`text-lg sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}> Performance Overview</CardTitle>
        </CardHeader>
        <CardContent className={`p-0 sm:p-6 ${theme === 'dark' ? 'bg-card text-card-foreground' : 'bg-white text-gray-900'}`}>
          {filteredSubjects.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-700">
              <div className={`p-6 rounded-full ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} shadow-sm`}>
                <Filter className="h-10 w-10 text-indigo-500/50" />
              </div>
              <div className="text-center px-6">
                <p className={`text-lg font-semibold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>No Data Found</p>
                <p className={`text-sm mt-1 max-w-[240px] mx-auto ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  We couldn't find any subjects matching your current criteria.
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full overflow-x-auto custom-scrollbar-premium pb-4 px-4 sm:px-0">
              <div
                style={{
                  minWidth: `${Math.max(100, filteredSubjects.length * (selectedIA === "all" ? 160 : 120))}px`,
                  height: '300px',
                  width: '100%'
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
          className="bg-primary"
          onClick={() => setShowFilter(true)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Table */}
      <div id="marks-table-card" className={`rounded-lg border overflow-hidden w-full ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-white'}`}>
        <div className="w-full overflow-x-auto custom-scrollbar-premium">
          <table className="w-full  text-left border-collapse">
            <thead className={`sticky top-0 z-10 text-md whitespace-nowrap ${theme === 'dark' ? 'bg-[#232326] text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
              <tr>
                <th className="px-4 py-3.5 font-semibold ">Subject</th>
                {selectedIA === 'all' ? (
                  <>
                    {[1, 2, 3, 4, 5].map(num => (
                      <th key={num} className="px-4 py-3.5 font-semibold text-center">IA {num}</th>
                    ))}
                  </>
                ) : (
                  <th className="px-4 py-3.5 font-semibold text-center">IA {selectedIA}</th>
                )}
                <th className="px-4 py-3.5 font-semibold text-center">Average</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-sm ${theme === 'dark' ? 'divide-gray-800' : 'divide-gray-100'}`}>
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={selectedIA === 'all' ? 5 : 3} className="py-20">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className={`p-6 rounded-full ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                        <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                      <div className="text-center">
                        <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Results Empty</p>
                        <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Try adjusting your filters</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((subject) => {
                  const tests = marksData[subject] || [];
                  const iaMarks = [1, 2, 3, 4, 5].map(num => tests.find((t) => t.test_number === num)?.mark ?? null);
                  const avg = subjectAverages[subject] || 0;

                  const selectedIAValue = selectedIA === 'all' ? null : parseInt(selectedIA);
                  const selectedIAMark = selectedIAValue ? tests.find((t) => t.test_number === selectedIAValue)?.mark ?? null : null;

                  return (
                    <tr key={subject} className={`group transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                      <td className="px-4 py-4 align-top">
                        <div className="font-medium leading-relaxed max-w-[200px] sm:max-w-none break-words">
                          {subject}
                        </div>
                      </td>
                      {selectedIA === 'all' ? (
                        <>
                          {iaMarks.map((mark, i) => (
                            <td key={i} className="px-4 py-4 text-center tabular-nums">{mark !== null ? mark : "-"}</td>
                          ))}
                        </>
                      ) : (
                        <td className="px-4 py-4 text-center tabular-nums">{selectedIAMark !== null ? selectedIAMark : "-"}</td>
                      )}
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md font-semibold tabular-nums ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                          {avg > 0 ? avg.toFixed(1) : "-"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter Dialog */}
      <Dialog open={showFilter} onOpenChange={setShowFilter}>
        <DialogContent className={`max-w-md w-[90%] sm:w-full mx-auto rounded-2xl ${theme === 'dark' ? 'bg-[#1c1c1e] text-gray-200 border-gray-700' : 'bg-white text-gray-900 border-gray-200'}`}>
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
                  <SelectItem value="4" className={theme === 'dark' ? 'hover:bg-[#2c2c2e] cursor-pointer text-xs sm:text-sm' : 'hover:bg-gray-100 cursor-pointer text-xs sm:text-sm'}>
                    IA 4
                  </SelectItem>
                  <SelectItem value="5" className={theme === 'dark' ? 'hover:bg-[#2c2c2e] cursor-pointer text-xs sm:text-sm' : 'hover:bg-gray-100 cursor-pointer text-xs sm:text-sm'}>
                    IA 5
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