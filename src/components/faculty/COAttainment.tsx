import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFacultyAssignmentsQuery } from "../../hooks/useApiQueries";
import { getUploadMarksBootstrap, GetUploadMarksBootstrapResponse, getQuestionPapers, getCOAttainment } from "../../utils/faculty_api";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable } from "@/components/ui/skeleton";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Component shows aggregated CO results only — per-question and per-student types removed

const COAttainment = () => {
  const { data: assignments = [], isLoading: assignmentsLoading } = useFacultyAssignmentsQuery();
  const [dropdownData, setDropdownData] = useState({
    branch: [] as { id: number; name: string }[],
    semester: [] as { id: number; number: number }[],
    section: [] as { id: number; name: string }[],
    subject: [] as { id: number; name: string }[],
    testType: ["IA1", "IA2", "IA3", "SEE"],
  });
  const [selected, setSelected] = useState({
    branch: "",
    branch_id: undefined as number | undefined,
    subject: "",
    subject_id: undefined as number | undefined,
    section: "",
    section_id: undefined as number | undefined,
    semester: "",
    semester_id: undefined as number | undefined,
    testType: "",
    question_paper_id: undefined as number | undefined,
  });
  // per-student marks removed: UI shows aggregated CO data from server
  const [errorMessage, setErrorMessage] = useState("");
  const { theme } = useTheme();
  
  // CO Attainment calculation states
  const [coAttainment, setCoAttainment] = useState<Record<string, {
    co: string;
    maxMarks: number;
    targetMarks: number;
    avgMarks: number;
    percentage: number; // Method 1: Average percentage
    studentsAboveTarget: number;
    totalStudents: number;
    attainmentLevel: number; // Method 1 attainment level
    method2Percentage: number; // Method 2: Percentage of students above target
    method2Level: number; // Method 2 attainment level
  }>>({});
  
  const [overallAttainment, setOverallAttainment] = useState<number>(0);
  
  // Indirect attainment states
  const [indirectAttainment, setIndirectAttainment] = useState<Record<string, number>>({});
  const [finalAttainment, setFinalAttainment] = useState<Record<string, {
    direct: number;
    indirect: number;
    final: number;
    level: number;
  }>>({});
  

  
  // Target threshold (default 60%, but configurable)
  const [targetThreshold, setTargetThreshold] = useState<number>(60);
  
  // Update dropdown data when assignments change
  useEffect(() => {
    const subjects = Array.from(
      new Map(assignments.map(a => [a.subject_id, { id: a.subject_id, name: a.subject_name }])).values()
    );
    setDropdownData(prev => ({ ...prev, subject: subjects }));
  }, [assignments]);

  const handleSelectChange = async (field: string, value: string | number) => {
    setErrorMessage("");
    const updated = { ...selected };
    if (field.endsWith('_id')) {
      updated[field] = value as number;
      if (field === 'branch_id') {
        const branchObj = dropdownData.branch.find(b => b.id === value);
        updated.branch = branchObj ? branchObj.name : "";
      } else if (field === 'semester_id') {
        const semObj = dropdownData.semester.find(s => s.id === value);
        updated.semester = semObj ? semObj.number.toString() : "";
      } else if (field === 'section_id') {
        const secObj = dropdownData.section.find(s => s.id === value);
        updated.section = secObj ? secObj.name : "";
      } else if (field === 'subject_id') {
        const subjObj = dropdownData.subject.find(s => s.id === value);
        updated.subject = subjObj ? subjObj.name : "";
      }
    } else {
      updated[field] = value as string;
    }
    setSelected(updated);
    // Only subject selection is required for CO attainment
    const { subject_id } = { ...updated };
    if (subject_id) {
      // Fetch aggregated CO attainment from server (no per-student marks by default)
      try {
        const data = await getCOAttainment({
          subject_id,
          target_pct: targetThreshold
        });

        if (!data || data.error) throw new Error(data.error || 'Failed to fetch CO attainment');

        const attainmentData: Record<string, any> = {};
        const finalAttainmentData: Record<string, any> = {};
        const initialIndirect: Record<string, number> = {};

        data.results.forEach((result: any) => {
          attainmentData[result.co] = {
            co: result.co,
            maxMarks: result.max_marks,
            targetMarks: result.max_marks * (targetThreshold / 100),
            avgMarks: result.avg_marks,
            // Method 1: average-based percentage
            percentage: result.avg_pct,
            // Method 2: students-above-target percentage
            method2Percentage: result.pct_students_above_target,
            studentsAboveTarget: result.students_above_target,
            totalStudents: result.total_students,
            // Levels: use the explicit backend-provided fields
            attainmentLevel: result.direct_attainment_level_by_avg ?? result.direct_attainment_level,
            method2Level: result.direct_attainment_level_by_students ?? result.direct_attainment_level,
          };

          finalAttainmentData[result.co] = {
            direct: result.direct_attainment_level_by_avg ?? result.direct_attainment_level,
            indirect: result.indirect_attainment_level,
            final: result.final_attainment_level,
            level: result.final_attainment_level,
          };

          initialIndirect[result.co] = 0;
        });

        setCoAttainment(attainmentData);
        setFinalAttainment(finalAttainmentData);
        setIndirectAttainment(initialIndirect);
        setOverallAttainment(data.course_attainment_level);
      } catch (err: unknown) {
        setErrorMessage((err as { message?: string })?.message || "Failed to fetch CO attainment");
      }
    }
  };

  // CO calculation is performed server-side via `/api/co-attainment/`.

  const handleIndirectAttainmentChange = (co: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    // Validate indirect attainment values (should be 0-3)
    if (numValue >= 0 && numValue <= 3) {
      setIndirectAttainment(prev => ({
        ...prev,
        [co]: numValue
      }));
    }
  };

  const handleCalculateFinalAttainment = async () => {
    if (!selected.subject_id) return;

    try {
      // Call backend API with indirect attainment
      const data = await getCOAttainment({
        subject_id: selected.subject_id,
        question_paper_id: selected.question_paper_id,
        target_pct: targetThreshold,
        indirect_attainment: JSON.stringify(indirectAttainment)
      });

      if (!data || data.error) throw new Error(data.error || 'Failed to fetch CO attainment');

      // Update state with backend results
      const attainmentData: Record<string, any> = {};
      data.results.forEach((result: any) => {
        attainmentData[result.co] = {
          co: result.co,
          maxMarks: result.max_marks,
          targetMarks: result.max_marks * (targetThreshold / 100),
          avgMarks: result.avg_marks,
          percentage: result.avg_pct,
          studentsAboveTarget: result.students_above_target,
          totalStudents: result.total_students,
          attainmentLevel: result.direct_attainment_level_by_avg ?? result.direct_attainment_level,
          method2Percentage: result.pct_students_above_target,
          method2Level: result.direct_attainment_level_by_students ?? result.direct_attainment_level,
        };
      });
      setCoAttainment(attainmentData);

      // Update final attainment from backend
      const finalAttainmentData: Record<string, any> = {};
      data.results.forEach((result: any) => {
        finalAttainmentData[result.co] = {
          direct: result.direct_attainment_level_by_avg ?? result.direct_attainment_level,
          indirect: result.indirect_attainment_level,
          final: result.final_attainment_level,
          level: result.final_attainment_level,
        };
      });
      setFinalAttainment(finalAttainmentData);

      // Update overall attainment
      setOverallAttainment(data.course_attainment_level);
    } catch (error) {
      console.error('Error calculating final attainment:', error);
      setErrorMessage('Failed to calculate final attainment');
    }
  };

  const handleTargetThresholdChange = (value: string) => {
    const numValue = parseFloat(value) || 60;
    // Validate target threshold (should be 0-100)
    if (numValue >= 0 && numValue <= 100) {
      setTargetThreshold(numValue);
    }
  };

  // CSV Export Function
  const handleExportCSV = () => {
    const csvData = [
      ['CO', 'Max Marks', 'Target Marks', 'Avg Marks', 'Students ≥ Target', 'Method 1 %', 'Method 1 Level', 'Method 2 %', 'Method 2 Level', 'Indirect', 'Final', 'Level'],
      ...Object.values(coAttainment).map(co => [
        co.co,
        co.maxMarks,
        co.targetMarks.toFixed(1),
        co.avgMarks.toFixed(2),
        `${co.studentsAboveTarget}/${co.totalStudents} (${co.totalStudents > 0 ? ((co.studentsAboveTarget / co.totalStudents) * 100).toFixed(1) : 0}%)`,
        `${co.percentage.toFixed(1)}%`,
        `Level ${co.attainmentLevel}`,
        `${co.method2Percentage.toFixed(1)}%`,
        `Level ${co.method2Level}`,
        indirectAttainment[co.co] || 0,
        finalAttainment[co.co] ? finalAttainment[co.co].final.toFixed(2) : "N/A",
        finalAttainment[co.co] ? `Level ${finalAttainment[co.co].level}` : "N/A"
      ])
    ];

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `CO_Attainment_Report_${selected.subject}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // PDF Export Function
  const handleExportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4') as jsPDF & { lastAutoTable?: { finalY: number } };
    
    // Add title
    doc.setFontSize(18);
    doc.text("CO Attainment Report", 14, 20);
    
    // Add selected filters information (subject only)
    doc.setFontSize(12);
    doc.text(`Subject: ${selected.subject}`, 14, 30);
    doc.text(`Target Threshold: ${targetThreshold}%`, 14, 37);
    
    // Add CO Attainment Results table
    autoTable(doc, {
      startY: 70,
      head: [['CO', 'Max Marks', 'Target Marks', 'Avg Marks', 'Students ≥ Target', 'Method 1 %', 'Method 1 Level', 'Method 2 %', 'Method 2 Level', 'Indirect', 'Final', 'Level']],
      body: Object.values(coAttainment).map(co => [
        co.co,
        co.maxMarks,
        co.targetMarks.toFixed(1),
        co.avgMarks.toFixed(2),
        `${co.studentsAboveTarget}/${co.totalStudents} (${co.totalStudents > 0 ? ((co.studentsAboveTarget / co.totalStudents) * 100).toFixed(1) : 0}%)`,
        `${co.percentage.toFixed(1)}%`,
        `Level ${co.attainmentLevel}`,
        `${co.method2Percentage.toFixed(1)}%`,
        `Level ${co.method2Level}`,
        indirectAttainment[co.co] || 0,
        finalAttainment[co.co] ? finalAttainment[co.co].final.toFixed(2) : "N/A",
        finalAttainment[co.co] ? `Level ${finalAttainment[co.co].level}` : "N/A"
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [162, 89, 255] }, // Purple color to match theme
    });
    
    // Add Overall Course Attainment with highlighting
    let finalY = doc.lastAutoTable?.finalY || 70;
    doc.setFontSize(16);
    doc.setTextColor(162, 89, 255); // Purple color
    doc.text("Overall Course Attainment", 14, finalY + 15);
    
    // Highlight the attainment level with a colored box
    const attainmentLevel = overallAttainment >= 2.7 ? 3 : overallAttainment >= 2.0 ? 2 : 1;
    const attainmentText = `${overallAttainment.toFixed(2)} (Level ${attainmentLevel})`;
    
    doc.setFillColor(162, 89, 255); // Purple background
    doc.setTextColor(255, 255, 255); // White text
    doc.setFontSize(14);
    doc.rect(14, finalY + 20, 60, 10, 'F'); // Filled rectangle
    doc.text(attainmentText, 44, finalY + 27, { align: 'center' });
    
    // Reset colors
    doc.setTextColor(0, 0, 0);
    
    // Save the PDF (student-level marks omitted — aggregated CO results only)
    doc.save(`CO_Attainment_Report_${selected.branch}_${selected.subject}_${selected.testType}.pdf`);
  };

  // Check if all dropdowns are selected
  const areAllDropdownsSelected = () => {
    return selected.subject_id !== undefined;
  };

  return (
    <div className={`w-full max-w-full min-h-screen md:min-h-screen h-auto md:h-auto overflow-visible ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={`${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'} w-full max-w-full shadow-lg border-none`}>
        <CardHeader className="p-6 border-b border-border/50">
          <CardTitle className="text-2xl font-semibold leading-none tracking-tight text-gray-900">CO Attainment Calculation</CardTitle>
          <p className="text-gray-600 text-sm">
            Calculate and analyze Course Outcome attainment based on assessment marks
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              {assignmentsLoading ? (
                <div className="h-11 bg-muted animate-pulse rounded-md" />
              ) : (
                <Select onValueChange={value => handleSelectChange('subject_id', Number(value))}>
                  <SelectTrigger className={`h-11 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-200'}`}>
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-200'}>
                    {dropdownData.subject.map((item) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target Threshold</label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={targetThreshold}
                  onChange={(e) => handleTargetThresholdChange(e.target.value)}
                  className={`h-11 pr-8 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-200'}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
              </div>
            </div>

            {selected.subject_id && (
              <div className="lg:col-span-2 flex items-end gap-3 h-full">
                <Button
                  onClick={handleExportPDF}
                  className="flex-1 h-11 bg-primary text-white hover:bg-primary/90 shadow-md transition-all duration-200"
                >
                  Download PDF Report
                </Button>
                <Button
                  onClick={handleExportCSV}
                  variant="outline"
                  className="flex-1 h-11 border-primary text-primary hover:bg-primary/10 shadow-sm"
                >
                  Export CSV
                </Button>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className={`p-4 rounded-xl flex items-center gap-3 border ${theme === 'dark' ? 'bg-destructive/10 border-destructive/20 text-destructive-foreground' : 'bg-red-50 border-red-100 text-red-700'}`}>
              <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
          )}

          {areAllDropdownsSelected() ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Statistics Overview Card */}
                <Card className="xl:col-span-1 border border-border/50 shadow-sm overflow-hidden bg-muted/20">
                  <CardHeader className="p-5 border-b border-border/50 bg-muted/40">
                    <CardTitle className="text-lg font-semibold leading-none tracking-tight text-gray-900">Attainment Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className={`p-6 rounded-2xl text-center border-2 ${theme === 'dark' ? 'bg-background/50 border-primary/20' : 'bg-white border-primary/10'} shadow-inner`}>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Overall Course Attainment</p>
                      <div className="text-5xl font-semibold text-primary tracking-tight">
                        {overallAttainment.toFixed(2)}
                      </div>
                      <div className={`mt-3 inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold ${overallAttainment >= 2.7 ? 'bg-green-500/10 text-green-500' : overallAttainment >= 2.0 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                        Level {overallAttainment >= 2.7 ? 3 : overallAttainment >= 2.0 ? 2 : 1}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="p-4 rounded-xl bg-background border border-border/50">
                        <h4 className="text-sm font-medium mb-3">Calculation Logic</h4>
                        <ul className="space-y-3 text-sm">
                          <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">M1</span>
                            <span className="text-foreground/80">Average marks per CO</span>
                          </li>
                          <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">M2</span>
                            <span className="text-foreground/80">% of students &ge; {targetThreshold}% target</span>
                          </li>
                          <li className="flex items-center gap-3 pt-2 border-t border-border/50">
                            <span className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs">F</span>
                            <span className="font-medium text-foreground">(0.8 &times; Direct) + (0.2 &times; Indirect)</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <Button
                      onClick={handleCalculateFinalAttainment}
                      className="w-full h-12 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold tracking-wide"
                    >
                      Recalculate Final Attainment
                    </Button>
                  </CardContent>
                </Card>

                {/* Main Results Table Card */}
                <Card className="xl:col-span-2 border border-border/50 shadow-sm">
                  <CardHeader className="p-5 border-b border-border/50">
                    <CardTitle className="text-lg font-semibold leading-none tracking-tight text-gray-900">Course Outcome Results</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="w-16 text-center font-medium">CO</TableHead>
                            <TableHead className="font-medium">Max</TableHead>
                            <TableHead className="font-medium">Target</TableHead>
                            <TableHead className="font-medium">Avg</TableHead>
                            <TableHead className="font-medium">% Above</TableHead>
                            <TableHead className="font-medium">M1 (Avg)</TableHead>
                            <TableHead className="font-medium">M2 (Students)</TableHead>
                            <TableHead className="w-24 font-medium text-center">Indirect</TableHead>
                            <TableHead className="text-right font-medium pr-6">Final Level</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.values(coAttainment).map((co) => (
                            <TableRow key={co.co} className="hover:bg-muted/30 transition-colors">
                              <TableCell className="text-center font-bold text-primary">{co.co}</TableCell>
                              <TableCell className="font-medium">{co.maxMarks}</TableCell>
                              <TableCell className="text-muted-foreground">{co.targetMarks.toFixed(1)}</TableCell>
                              <TableCell className="font-semibold">{co.avgMarks.toFixed(2)}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${co.totalStudents > 0 && (co.studentsAboveTarget / co.totalStudents) >= 0.6 ? 'bg-green-500' : 'bg-amber-500'}`}
                                      style={{ width: `${co.totalStudents > 0 ? (co.studentsAboveTarget / co.totalStudents) * 100 : 0}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-muted-foreground">
                                    {co.totalStudents > 0 ? ((co.studentsAboveTarget / co.totalStudents) * 100).toFixed(0) : 0}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold">L{co.attainmentLevel}</span>
                                  <span className="text-[10px] text-muted-foreground">{co.percentage.toFixed(0)}%</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold">L{co.method2Level}</span>
                                  <span className="text-[10px] text-muted-foreground">{co.method2Percentage.toFixed(0)}%</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  min="0"
                                  max="3"
                                  step="0.1"
                                  value={indirectAttainment[co.co] || 0}
                                  onChange={(e) => handleIndirectAttainmentChange(co.co, e.target.value)}
                                  className="w-16 h-8 text-center mx-auto text-xs font-bold bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
                                />
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="flex flex-col items-end">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-tight ${
                                    finalAttainment[co.co]?.level === 3 
                                      ? 'bg-green-500/10 text-green-600' 
                                      : finalAttainment[co.co]?.level === 2 
                                        ? 'bg-amber-500/10 text-amber-600' 
                                        : 'bg-red-500/10 text-red-600'
                                  }`}>
                                    Level {finalAttainment[co.co]?.level ?? "N/A"}
                                  </span>
                                  <span className="text-[10px] font-medium text-muted-foreground mt-1">
                                    Score: {finalAttainment[co.co] ? finalAttainment[co.co].final.toFixed(2) : "N/A"}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className={`p-12 text-center rounded-3xl border-2 border-dashed ${theme === 'dark' ? 'bg-muted/10 border-border' : 'bg-gray-50 border-gray-200'}`}>
              <div className="mx-auto w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Select a Subject</h3>
              <p className="mt-2 text-gray-600 text-sm">
                Choose a subject from the dropdown above to start calculating CO attainment
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default COAttainment;