import React from "react";
import { translateTerminology } from "@/utils/institutionConfig";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface Assignment {
  readonly subject?: string;
  readonly branch?: string;
  readonly semester?: string | number;
  readonly section?: string | number;
}

export interface ScheduledClass {
  readonly id: number;
  readonly day?: string;
  readonly start_time?: string;
  readonly end_time?: string;
  readonly subject?: string;
  readonly section?: string;
  readonly duration_hours?: number;
}

// ─── Subcomponent: Assignments List ──────────────────────────────────────────

export interface AssignmentsListProps {
  readonly assignments: readonly Assignment[];
  readonly theme: string;
}

export function AssignmentsList({ assignments, theme }: AssignmentsListProps) {
  const list = assignments || [];

  return (
    <>
      {list.length === 0 ? (
        <div
          className={`col-span-full flex flex-col items-center justify-center py-12 px-4 rounded-xl border-2 border-dashed ${theme === "dark" ? "border-border bg-card/30 text-muted-foreground" : "border-gray-200 bg-gray-50/50 text-gray-500"
            }`}
        >
          <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
            <svg className="w-8 h-8 text-primary opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            No assignments found
          </h3>
          <p className={`text-center max-w-sm text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
            There are currently no assignments listed for this faculty member.
          </p>
        </div>
      ) : (
        list.map((a, idx) => {
          const key = a.subject
            ? `${a.subject}-${a.branch ?? ""}-${a.section ?? ""}`
            : `assignment-${idx}`;
          return (
            <div
              key={key}
              className={`border rounded-lg p-4 hover:shadow-md transition-shadow flex flex-col ${theme === "dark"
                ? "bg-muted/50 border-border"
                : "bg-gray-50 border-gray-200"
                }`}
            >
              <div
                className={`font-semibold mb-3 leading-tight ${theme === "dark" ? "text-foreground" : "text-gray-800"
                  }`}
              >
                {a.subject}
              </div>
              <div className="flex flex-wrap gap-2 mt-auto">
                {a.branch && <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${theme === "dark" ? "bg-blue-900/30 text-blue-300" : "bg-blue-100 text-blue-800"}`}>{a.branch}</span>}
                {a.semester && <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${theme === "dark" ? "bg-green-900/30 text-green-300" : "bg-green-100 text-green-800"}`}>{translateTerminology(typeof a.semester === 'number' || (a.semester && !String(a.semester).toLowerCase().includes('sem')) ? `Semester ${a.semester}` : String(a.semester))}</span>}
                {a.section && <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${theme === "dark" ? "bg-purple-900/30 text-purple-300" : "bg-purple-100 text-purple-800"}`}>Section {a.section}</span>}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}

// ─── Subcomponent: Scheduled Classes Table ───────────────────────────────────

export interface ScheduledClassesTableProps {
  readonly classesList: readonly ScheduledClass[];
  readonly theme: string;
}

const SCHEDULE_PAGE_SIZE = 10;

export function ScheduledClassesTable({ classesList, theme }: ScheduledClassesTableProps) {
  const list = classesList || [];
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalPages = Math.max(1, Math.ceil(list.length / SCHEDULE_PAGE_SIZE));
  const paginated = list.slice((currentPage - 1) * SCHEDULE_PAGE_SIZE, currentPage * SCHEDULE_PAGE_SIZE);

  const emptyState = (
    <div className={`flex flex-col items-center justify-center py-12 px-4 m-4 rounded-xl border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
      <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
        <svg className="w-8 h-8 text-primary opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No scheduled classes found</h3>
      <p className={`text-center max-w-sm text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>There are no classes scheduled for this faculty member.</p>
    </div>
  );

  const paginationFooter = totalPages > 1 && (
    <CardFooter className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-border mt-auto gap-3">
      <div className={`text-xs font-medium ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>
        Page {currentPage} of {totalPages} ({list.length} records)
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="h-8 px-3 text-white bg-primary border-primary hover:bg-primary/90 hover:text-white transition-all rounded-lg font-bold text-xs">Prev</Button>
        <div className={`flex items-center justify-center min-w-[36px] h-8 px-2 text-sm font-bold rounded-lg border ${theme === "dark" ? "bg-card border-border text-foreground" : "bg-white border-gray-200 text-gray-900"}`}>{currentPage}</div>
        <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="h-8 px-3 text-white bg-primary border-primary hover:bg-primary/90 hover:text-white transition-all rounded-lg font-bold text-xs">Next</Button>
      </div>
    </CardFooter>
  );

  return (
    <Card className={`shadow-none border overflow-hidden ${theme === "dark" ? "bg-card border-border" : "bg-white border-gray-200"}`}>
      <CardContent className="p-0">
        {list.length === 0 ? emptyState : (
          <>
            {/* ── Mobile card list (< sm) ────────────────────────────────── */}
            <div className="sm:hidden divide-y divide-border">
              {paginated.map((s) => (
                <div key={s.id} className={`p-4 space-y-2 ${theme === 'dark' ? 'hover:bg-accent/30' : 'hover:bg-gray-50'} transition-colors`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${theme === "dark" ? "bg-blue-900/30 text-blue-300" : "bg-blue-100 text-blue-800"}`}>{s.day}</span>
                    <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{s.start_time} – {s.end_time}</span>
                    <span className={`text-xs font-bold ${theme === 'dark' ? 'text-foreground/70' : 'text-gray-600'}`}>{s.duration_hours} hrs</span>
                  </div>
                  <div className={`text-sm font-semibold ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>{s.subject}</div>
                  {s.section && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${theme === "dark" ? "bg-green-900/30 text-green-300" : "bg-green-100 text-green-800"}`}>Section {s.section}</span>
                  )}
                </div>
              ))}
            </div>

            {/* ── Desktop table (≥ sm) ───────────────────────────────────── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className={theme === "dark" ? "bg-muted/50" : "bg-gray-50"}>
                  <tr>
                    {["Day", "Time", "Subject", "Section", "Hours"].map((h) => (
                      <th key={h} className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === "dark" ? "divide-border" : "divide-gray-200"}`}>
                  {paginated.map((s) => (
                    <tr key={s.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-accent/30' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${theme === "dark" ? "bg-blue-900/30 text-blue-300" : "bg-blue-100 text-blue-800"}`}>{s.day}</span>
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>{s.start_time} – {s.end_time}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>{s.subject}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide ${theme === "dark" ? "bg-green-900/30 text-green-300" : "bg-green-100 text-green-800"}`}>{s.section}</span>
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold opacity-75 ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>{s.duration_hours} hrs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
      {paginationFooter}
    </Card>
  );
}

