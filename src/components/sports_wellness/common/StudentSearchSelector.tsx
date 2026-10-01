import React, { useState, useEffect, useRef } from "react";
import { Search, User, X, AlertTriangle, Droplet, ChevronLeft, ChevronRight } from "lucide-react";
import { sportsWellnessApi, StudentSearchItem } from "../../../utils/sports_wellness_api";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Card } from "../../ui/card";
import { Button } from "../../ui/button";

interface StudentSearchSelectorProps {
  selectedStudent: StudentSearchItem | null;
  onSelectStudent: (student: StudentSearchItem | null) => void;
  placeholder?: string;
}

export const StudentSearchSelector: React.FC<StudentSearchSelectorProps> = ({
  selectedStudent,
  onSelectStudent,
  placeholder = "Search student by name or USN...",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<StudentSearchItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchStudents = async (query: string) => {
    setLoading(true);
    try {
      const data = await sportsWellnessApi.searchStudents(query);
      setResults(data);
      setPage(1);
    } catch (err) {
      console.error("Student search error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fetchStudents(searchTerm);
      }, searchTerm ? 250 : 0);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, isOpen]);

  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const paginatedResults = results.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {selectedStudent ? (
        <Card className="flex flex-row items-center justify-between px-3 py-2 bg-primary/5 border-primary/20 shadow-none rounded-xl">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0">
              {selectedStudent.name ? selectedStudent.name.charAt(0).toUpperCase() : "S"}
            </div>
            <div className="truncate">
              <span className="font-semibold text-foreground mr-2 text-xs">
                {selectedStudent.name}
              </span>
              <span className="text-[11px] text-primary font-mono font-medium">
                ({selectedStudent.usn})
              </span>
              {selectedStudent.blood_group && (
                <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1 border-rose-400/40 text-rose-600 dark:text-rose-400">
                  <Droplet className="h-2.5 w-2.5 mr-0.5 inline text-rose-500" />
                  {selectedStudent.blood_group}
                </Badge>
              )}
              {selectedStudent.has_medical_alert && (
                <span className="ml-1.5 inline-flex items-center text-amber-500" title="Has medical alert">
                  <AlertTriangle size={12} />
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectStudent(null);
              setSearchTerm("");
            }}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition"
          >
            <X size={15} />
          </button>
        </Card>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            value={searchTerm}
            onFocus={() => {
              setIsOpen(true);
              if (results.length === 0) fetchStudents(searchTerm);
            }}
            onClick={() => {
              setIsOpen(true);
              if (results.length === 0) fetchStudents(searchTerm);
            }}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            placeholder={placeholder}
            className="pl-9 pr-8 h-9 text-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                fetchStudents("");
              }}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {isOpen && !selectedStudent && (
        <Card className="absolute z-50 w-full mt-1 shadow-xl max-h-80 overflow-hidden p-0 border border-border/70 flex flex-col bg-popover text-popover-foreground">
          {loading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">Searching students...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">No students found</div>
          ) : (
            <>
              <div className="overflow-y-auto max-h-60 divide-y divide-border/40">
                {paginatedResults.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => {
                      onSelectStudent(student);
                      setIsOpen(false);
                    }}
                    className="w-full px-3 py-2.5 text-left hover:bg-muted/50 transition flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-[11px]">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {student.name}
                        </div>
                        <div className="text-muted-foreground font-mono text-[11px]">
                          {student.usn} {student.branch_name ? `• ${student.branch_name}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {student.blood_group && (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1 font-bold text-rose-600 dark:text-rose-400">
                          {student.blood_group}
                        </Badge>
                      )}
                      {student.has_medical_alert && (
                        <AlertTriangle size={13} className="text-amber-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-card text-xs text-muted-foreground shrink-0 rounded-b-xl">
                  <span className="text-[11px]">
                    Showing <span className="font-semibold text-foreground">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, results.length)}</span> of <span className="font-semibold text-foreground">{results.length}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPage((p) => Math.max(1, p - 1));
                      }}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-8 px-3 transition-all text-xs"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center justify-center min-w-[1.5rem]">
                      <span className="text-xs font-semibold text-foreground">
                        {page}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPage((p) => Math.min(totalPages, p + 1));
                      }}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-8 px-3 transition-all text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
};
