import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem } from
"@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTheme } from "@/context/ThemeContext";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { FileDown, Loader2 } from "lucide-react";

const COAttainment = () => {
  const [dropdownData, setDropdownData] = useState({
    branch: [] as { id: number; name: string }[],
    batch: [] as { id: number; name: string }[],
    semester: [] as {id: number;number: number;}[],
    section: [] as {id: number;name: string;}[],
    subject: [] as {id: number;name: string;}[],
    testType: ["IA1", "IA2", "IA3", "IA4", "IA5", "SEE"]
  });
  const [selected, setSelected] = useState({
    branch: "",
    branch_id: undefined as number | undefined,
    batch: "",
    batch_id: undefined as number | undefined,
    subject: "",
    subject_id: undefined as number | undefined,
    section: "",
    section_id: undefined as number | undefined,
    semester: "",
    semester_id: undefined as number | undefined,
    testType: "",
    question_paper_id: undefined as number | undefined
  });

  const [isDataLoading, setIsDataLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const { theme } = useTheme();
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // CO results states
  const [coAttainment, setCoAttainment] = useState<Record<string, any>>({});
  const [overallAttainment, setOverallAttainment] = useState<number>(0);

  // Indirect attainment states
  const [indirectAttainment, setIndirectAttainment] = useState<Record<string, number>>({});
  const [finalAttainment, setFinalAttainment] = useState<Record<string, {
    direct: number;
    indirect: number;
    final: number;
    level: number;
  }>>({});
  
  // PO Attainment state
  const [poAttainment, setPoAttainment] = useState<Record<string, number>>({});
  const [copoMapping, setCopoMapping] = useState<Record<string, Record<string, number | null>>>({});

  const [targetThreshold, setTargetThreshold] = useState<number | "">(60);

  // Initial data fetch
  useEffect(() => {
    const fetchBootstrapData = async () => {
      try {
        Promise.all([
          fetchWithTokenRefresh(`${API_ENDPOINT}/hod/branches/`).then((res) => res.json()),
          fetchWithTokenRefresh(`${API_ENDPOINT}/hod/batches/`).then((res) => res.json()),
          fetchWithTokenRefresh(`${API_ENDPOINT}/hod/subject-bootstrap/?include=semesters`).then((res) => res.json())
        ]).then(([branchRes, batchRes, semRes]) => {
          setDropdownData((prev) => ({
            ...prev,
            branch: branchRes.success ? branchRes.data : [],
            batch: batchRes.success ? (batchRes.batches || batchRes.data) : [],
            semester: semRes.data.semesters || [],
          }));
        });
      } catch (err) {
        console.error("Failed to load bootstrap data", err);
      }
    };
    fetchBootstrapData();
  }, []);

  // Update subjects based on selected semester
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selected.semester_id) {
        setDropdownData(prev => ({ ...prev, subject: [] }));
        return;
      }
      try {
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/subjects/?semester_id=${selected.semester_id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            setDropdownData(prev => ({
              ...prev,
              subject: data.data.map((sub: any) => ({ id: Number(sub.id), name: sub.name }))
            }));
          } else if (data.success && data.data && Array.isArray(data.data.subjects)) {
            // Fallback just in case the API structure changes back
            setDropdownData(prev => ({
              ...prev,
              subject: data.data.subjects.map((sub: any) => ({ id: Number(sub.id), name: sub.name }))
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load subjects", err);
      }
    };
    fetchSubjects();
  }, [selected.semester_id]);

  const handleSelectChange = async (field: string, value: string | number) => {
    setErrorMessage("");
    const updated = { ...selected };
    if (field.endsWith('_id')) {
      updated[field] = value as number;
      if (field === 'branch_id') {
        const branchObj = dropdownData.branch.find((b) => b.id === value);
        updated.branch = branchObj ? branchObj.name : "";
      } else if (field === 'batch_id') {
        const batchObj = dropdownData.batch.find((b) => b.id === value);
        updated.batch = batchObj ? batchObj.name : "";
      } else if (field === 'semester_id') {
        const semObj = dropdownData.semester.find((s) => s.id === value);
        updated.semester = semObj ? semObj.number.toString() : "";
      } else if (field === 'section_id') {
        const secObj = dropdownData.section.find((s) => s.id === value);
        updated.section = secObj ? secObj.name : "";
      } else if (field === 'subject_id') {
        const subjObj = dropdownData.subject.find((s) => s.id === value);
        updated.subject = subjObj ? subjObj.name : "";
      }
    } else {
      updated[field] = value as string;
    }
    setSelected(updated);
    // Only subject selection is required for CO attainment
    const { subject_id, batch_id } = { ...updated };
    if (subject_id) {
      try {
        const params = new URLSearchParams({
          subject_id: subject_id.toString(),
          target_pct: (targetThreshold || 60).toString()
        });
        if (batch_id) params.append('batch_id', batch_id.toString());

        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/co-attainment/?${params.toString()}`);
        const data = await response.json();

        if (!response.ok || data.error) throw new Error(data.error || 'Failed to fetch CO attainment');

        const attainmentData: Record<string, any> = {};
        const finalAttainmentData: Record<string, any> = {};
        const initialIndirect: Record<string, number> = {};

        data.results.forEach((result: any) => {
          attainmentData[result.co] = {
            co: result.co,
            maxMarks: result.max_marks,
            targetMarks: result.max_marks * ((Number(targetThreshold) || 60) / 100),
            avgMarks: result.avg_marks,
            // Method 1: average-based percentage
            percentage: result.avg_pct,
            // Method 2: students-above-target percentage
            method2Percentage: result.pct_students_above_target,
            studentsAboveTarget: result.students_above_target,
            totalStudents: result.total_students,
            // Levels: use the explicit backend-provided fields
            attainmentLevel: result.direct_attainment_level_by_avg ?? result.direct_attainment_level,
            method2Level: result.direct_attainment_level_by_students ?? result.direct_attainment_level
          };

          finalAttainmentData[result.co] = {
            direct: result.direct_attainment_level_by_avg ?? result.direct_attainment_level,
            indirect: result.indirect_attainment_level,
            final: result.final_attainment_level,
            level: result.final_attainment_level
          };

          initialIndirect[result.co] = 0;
        });

        setCoAttainment(attainmentData);
        setFinalAttainment(finalAttainmentData);
        setIndirectAttainment(initialIndirect);
        setOverallAttainment(data.course_attainment_level);
        if (data.po_attainment) setPoAttainment(data.po_attainment);
        
        // Fetch CO-PO mappings
        const mappingRes = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/copo-mapping/?subject_id=${subject_id}`);
        if (mappingRes.ok) {
            const mappingData = await mappingRes.json();
            if (mappingData.mappings) {
                setCopoMapping(mappingData.mappings);
            }
        }
      } catch (err: unknown) {
        setErrorMessage((err as {message?: string;})?.message || "Failed to fetch CO attainment");
      }
    }
  };

  // CO calculation is performed server-side via `/api/co-attainment/`.

  const handleIndirectAttainmentChange = (co: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    // Validate indirect attainment values (should be 0-3)
    if (numValue >= 0 && numValue <= 3) {
      setIndirectAttainment((prev) => ({
        ...prev,
        [co]: numValue
      }));
    }
  };

  const handleCalculateFinalAttainment = async () => {
    if (!selected.subject_id) return;

    try {
      // Call backend API with indirect attainment
      const params = new URLSearchParams({
        subject_id: selected.subject_id.toString(),
        target_pct: (targetThreshold || 60).toString(),
        indirect_attainment: JSON.stringify(indirectAttainment)
      });
      if (selected.batch_id) params.append('batch_id', selected.batch_id.toString());
      
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/co-attainment/?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || data.error) throw new Error(data.error || 'Failed to fetch CO attainment');

      // Update state with backend results
      const attainmentData: Record<string, any> = {};
      data.results.forEach((result: any) => {
        attainmentData[result.co] = {
          co: result.co,
          maxMarks: result.max_marks,
          targetMarks: result.max_marks * ((Number(targetThreshold) || 60) / 100),
          avgMarks: result.avg_marks,
          percentage: result.avg_pct,
          studentsAboveTarget: result.students_above_target,
          totalStudents: result.total_students,
          attainmentLevel: result.direct_attainment_level_by_avg ?? result.direct_attainment_level,
          method2Percentage: result.pct_students_above_target,
          method2Level: result.direct_attainment_level_by_students ?? result.direct_attainment_level
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
          level: result.final_attainment_level
        };
      });
      setFinalAttainment(finalAttainmentData);

      // Update overall attainment
      setOverallAttainment(data.course_attainment_level);
      if (data.po_attainment) setPoAttainment(data.po_attainment);
    } catch (error) {

      setErrorMessage('Failed to calculate final attainment');
    }
  };

  const handleTargetThresholdChange = (value: string) => {
    if (value === "") {
      setTargetThreshold("");
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setTargetThreshold(numValue);
    }
  };

  // PDF Export Function
  const handleExportPDF = async () => {
    if (!selected.subject_id) return;
    setDownloadingPDF(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({
        subject_id: selected.subject_id.toString(),
        target_pct: (targetThreshold || 60).toString(),
        indirect_attainment: JSON.stringify(indirectAttainment)
      });
      if (selected.batch_id) params.append('batch_id', selected.batch_id.toString());

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/co-attainment/export-pdf/?${params.toString()}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const contentDisposition = response.headers.get("Content-Disposition");
        let filename = `CO_Attainment_Report_${selected.subject.replace(/\s+/g, '_')}.pdf`;
        if (contentDisposition) {
          const matches = /filename="?([^"]+)"?/.exec(contentDisposition);
          if (matches && matches[1]) {
            filename = matches[1];
          }
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const result = await response.json().catch(() => ({}));
        setErrorMessage(result.error || "Failed to export PDF report");
      }
    } catch (err) {
      setErrorMessage("Network error while exporting PDF");
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Check if all dropdowns are selected
  const areAllDropdownsSelected = () => {
    return selected.subject_id !== undefined;
  };

  return (
    <div id="co-attainment-container">
      <Card>
        <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>CO Attainment</CardTitle>
            <CardDescription className="text-[16px] sm:text-sm text-muted-foreground mt-1">
              Analyze Course Outcome (CO) attainment levels and PO mapping.
            </CardDescription>
          </div>
          <>
            {/* Desktop Button */}
            <Button
              onClick={handleExportPDF}
              disabled={downloadingPDF || !selected.subject_id || Object.keys(coAttainment).length === 0}
              className="hidden md:flex h-10 bg-primary text-white hover:bg-primary/90 shadow-sm transition-all duration-200 items-center justify-center gap-2 disabled:opacity-50 text-sm px-4">
              {downloadingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              Export PDF
            </Button>
            {/* Mobile Button */}
            <Button
              onClick={handleExportPDF}
              disabled={downloadingPDF || !selected.subject_id || Object.keys(coAttainment).length === 0}
              variant="outline"
              size="icon"
              className="flex md:hidden dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 bg-white text-zinc-900 border border-zinc-200 h-10 w-10"
            >
              {downloadingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
            </Button>
          </>
        </CardHeader>
        <CardContent className="pt-3 space-y-4">
          <div id="co-attainment-selectors" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Batch (Optional)</label>
              <Select
                value={selected.batch_id?.toString() || ""}
                onValueChange={(value) => {
                  handleSelectChange('batch_id', Number(value));
                  setTimeout(() => setIsSemesterOpen(true), 150);
                }}
                disabled={dropdownData.batch.length === 0}>
                <SelectTrigger className={`h-11 ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`} disabled={dropdownData.batch.length === 0}>
                  <SelectValue placeholder={dropdownData.batch.length === 0 ? "No batch available" : "All Batches"} />
                </SelectTrigger>
                <SelectContent className={`max-h-[200px] overflow-y-auto custom-scrollbar ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
                  {dropdownData.batch.length === 0 ? (
                    <SelectItem value="none" disabled>No batch available</SelectItem>
                  ) : (
                    <>
                      <SelectItem value="0">All Batches</SelectItem>
                      {dropdownData.batch.map((item) =>
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.name}
                        </SelectItem>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{translateTerminology("Semester")}</label>
              <Select
                open={isSemesterOpen}
                onOpenChange={setIsSemesterOpen}
                value={selected.semester_id?.toString() || ""}
                onValueChange={(value) => {
                  handleSelectChange('semester_id', Number(value));
                  setTimeout(() => setIsSubjectOpen(true), 150);
                }}
                disabled={dropdownData.semester.length === 0}>
                <SelectTrigger className={`h-11 ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`} disabled={dropdownData.semester.length === 0}>
                  <SelectValue placeholder={dropdownData.semester.length === 0 ? "No semester available" : "Select Semester"} />
                </SelectTrigger>
                <SelectContent className={`max-h-[200px] overflow-y-auto custom-scrollbar ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
                  {dropdownData.semester.length === 0 ? (
                    <SelectItem value="none" disabled>No semester available</SelectItem>
                  ) : (
                    dropdownData.semester.map((item) =>
                      <SelectItem key={item.id} value={item.id.toString()}>
                        Semester {item.number}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Select
                open={isSubjectOpen}
                onOpenChange={setIsSubjectOpen}
                value={selected.subject_id?.toString() || ""}
                onValueChange={(value) => handleSelectChange('subject_id', Number(value))}
                disabled={!selected.semester_id || dropdownData.subject.length === 0}>
                <SelectTrigger className={`h-11 ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`} disabled={!selected.semester_id || dropdownData.subject.length === 0}>
                  <SelectValue placeholder={
                    !selected.semester_id ?
                      "Select Semester First" :
                      dropdownData.subject.length === 0 ?
                      "No subject available" :
                      "Select Subject"
                  } />
                </SelectTrigger>
                <SelectContent className={`max-h-[200px] overflow-y-auto custom-scrollbar ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
                  {!selected.semester_id ? (
                    <SelectItem value="none" disabled>Select semester first</SelectItem>
                  ) : dropdownData.subject.length === 0 ? (
                    <SelectItem value="none" disabled>No subject available</SelectItem>
                  ) : (
                    dropdownData.subject.map((item) =>
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
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
                  className={`h-11 pr-8 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-200'}`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
              </div>
            </div>
          </div>

          {errorMessage &&
          <div className={`p-4 rounded-xl flex items-center gap-3 border ${theme === 'dark' ? 'bg-destructive/10 border-destructive/20 text-destructive-foreground' : 'bg-red-50 border-red-100 text-red-700'}`}>
              <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
          }

          {areAllDropdownsSelected() ?
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
                      <div className={`mt-3 inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${overallAttainment >= 2.7 ? 'bg-green-500/10 text-green-500' : overallAttainment >= 2.0 ? 'bg-amber-500/10 text-amber-500' : overallAttainment >= 1.0 ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'}`}>
                        Level {overallAttainment >= 2.7 ? 3 : overallAttainment >= 2.0 ? 2 : overallAttainment >= 1.0 ? 1 : 0}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="p-4 rounded-xl bg-background border border-border/50">
                        <h4 className="text-sm font-medium mb-3">Calculation Logic</h4>
                        <ul className="space-y-3 text-sm">
                          <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">M1</span>
                            <span className="text-foreground/80">Average marks per CO</span>
                          </li>
                          <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">M2</span>
                            <span className="text-foreground/80">% of students &ge; {targetThreshold}% target</span>
                          </li>
                          <li className="flex items-center gap-3 pt-2 border-t border-border/50">
                            <span className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center font-semibold text-xs">F</span>
                            <span className="font-medium text-foreground">(0.8 &times; Direct) + (0.2 &times; Indirect)</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <Button
                    onClick={handleCalculateFinalAttainment}
                    className="w-full h-12 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 font-semibold tracking-wide">
                    
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
                            <TableHead className="text-right font-medium pr-6 whitespace-nowrap">Final Level</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.values(coAttainment).map((co) =>
                        <TableRow key={co.co} className="hover:bg-muted/30 transition-colors">
                              <TableCell className="text-center font-semibold text-primary whitespace-nowrap">{co.co}</TableCell>
                              <TableCell className="font-medium whitespace-nowrap">{co.maxMarks}</TableCell>
                              <TableCell className="text-muted-foreground whitespace-nowrap">{co.targetMarks.toFixed(1)}</TableCell>
                              <TableCell className="font-semibold whitespace-nowrap">{co.avgMarks.toFixed(2)}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                    <div
                                  className={`h-full rounded-full ${co.totalStudents > 0 && co.studentsAboveTarget / co.totalStudents >= 0.6 ? 'bg-green-500' : 'bg-amber-500'}`}
                                  style={{ width: `${co.totalStudents > 0 ? co.studentsAboveTarget / co.totalStudents * 100 : 0}%` }} />
                                
                                  </div>
                                  <span className="text-[10px] font-semibold text-muted-foreground">
                                    {co.totalStudents > 0 ? (co.studentsAboveTarget / co.totalStudents * 100).toFixed(0) : 0}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold">L{co.attainmentLevel}</span>
                                  <span className="text-[10px] text-muted-foreground">{co.percentage.toFixed(0)}%</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold">L{co.method2Level}</span>
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
                              className="w-16 h-8 text-center mx-auto text-xs font-semibold bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary" />
                            
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="flex flex-col items-end">
                                  <span className={`whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-tight ${finalAttainment[co.co]?.level === 3 ?
                              'bg-green-500/10 text-green-600' :
                              finalAttainment[co.co]?.level === 2 ?
                              'bg-amber-500/10 text-amber-600' :
                              'bg-red-500/10 text-red-600'}`
                              }>
                                    Level {finalAttainment[co.co]?.level ?? "N/A"}
                                  </span>
                                  <span className="text-[10px] font-medium text-muted-foreground mt-1">
                                    Score: {finalAttainment[co.co] ? finalAttainment[co.co].final.toFixed(2) : "N/A"}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* PO Attainment & Mapping Card */}
              <div className="mt-6">
                <Card className="border border-border/50 shadow-sm">
                  <CardHeader className="p-5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                    <CardTitle className="text-lg font-semibold leading-none tracking-tight text-gray-900">Program Outcome (PO) Attainment</CardTitle>
                    <Button 
                      onClick={async () => {
                        try {
                          await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/copo-mapping/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ subject_id: selected.subject_id, mappings: copoMapping })
                          });
                          await handleCalculateFinalAttainment();
                        } catch (err) {
                          setErrorMessage("Failed to save mapping");
                        }
                      }}
                      className="bg-primary text-white h-8 w-full sm:w-auto"
                    >
                      Save Mapping & Recalculate
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="w-16 font-medium">CO \ PO</TableHead>
                            {[...Array(12)].map((_, i) => (
                              <TableHead key={i} className="text-center font-medium w-12">PO{i + 1}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.values(coAttainment).map((co) => (
                            <TableRow key={co.co} className="hover:bg-muted/30">
                              <TableCell className="font-semibold">{co.co}</TableCell>
                              {[...Array(12)].map((_, i) => {
                                const poKey = `po${i + 1}`;
                                const val = copoMapping[co.co]?.[poKey] ?? "";
                                return (
                                  <TableCell key={i} className="p-1">
                                    <Input 
                                      type="number" min="0" max="3" 
                                      value={val}
                                      onChange={(e) => {
                                        const v = e.target.value ? parseInt(e.target.value) : null;
                                        setCopoMapping(prev => ({
                                          ...prev,
                                          [co.co]: { ...(prev[co.co] || {}), [poKey]: v }
                                        }));
                                      }}
                                      className="h-8 w-full text-center text-xs p-1"
                                    />
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                          <TableRow className="bg-primary/5 font-semibold">
                            <TableCell>Attainment</TableCell>
                            {[...Array(12)].map((_, i) => (
                              <TableCell key={i} className="text-center text-primary">
                                {poAttainment[`po${i + 1}`] ? poAttainment[`po${i + 1}`].toFixed(2) : "-"}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div> :

          <div className={`p-12 text-center rounded-3xl border-2 border-dashed ${theme === 'dark' ? 'bg-muted/10 border-border' : 'bg-gray-50 border-gray-200'}`}>
              <div className="mx-auto w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4 bg-primary/20">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Select a Subject</h3>
              <p className="mt-2 text-gray-600 text-sm">
                Choose a subject from the dropdown above to start calculating CO attainment
              </p>
            </div>
          }
        </CardContent>
      </Card>
    </div>);

};

export default COAttainment;