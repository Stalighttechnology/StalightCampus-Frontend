import React, { useRef, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { publicViewResultByToken } from '@/utils/coe_api'

const ResultsView: React.FC = () => {
  const { token: paramToken } = useParams<{ token: string }>();
  const location = useLocation();
  // Accept token from route param or query string (?token=...)
  const q = new URLSearchParams(location.search);
  const token = paramToken || q.get('token') || '';
  const [usn, setUsn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const calcPassPercent = (marks: any[]) => {
    if (!Array.isArray(marks) || marks.length === 0) return null;
    const total = marks.length;
    const passed = marks.filter((m: any) => m.status === 'pass').length;
    return Math.round((passed / total) * 100);
  };

  const calcCGPA = (marks: any[]) => {
    if (!Array.isArray(marks) || marks.length === 0) return null;
    let weightedGP = 0;
    let totalCredits = 0;

    for (const m of marks) {
      // robustly fetch credits (common field names)
      const credits = Number(
        m?.credits ?? m?.credit ?? m?.credit_hours ?? m?.creditHours ?? m?.credit_hour ?? 0
      );
      if (!credits || credits <= 0) continue; // exclude zero-credit or invalid

      // prefer provided total, else try to sum cie+see
      let total = m?.total;
      if (total == null) {
        const cie = typeof m?.cie === 'number' ? m.cie : Number(m?.cie);
        const see = typeof m?.see === 'number' ? m.see : Number(m?.see);
        if (!Number.isFinite(cie) || !Number.isFinite(see)) continue;
        total = cie + see;
      }
      total = Number(total);
      if (!Number.isFinite(total)) continue;

      // convert marks (out of 100) to grade point on 10-point scale
      const gp = Math.max(0, total / 10);
      weightedGP += gp * credits;
      totalCredits += credits;
    }

    if (totalCredits === 0) return null;
    const cgpa = weightedGP / totalCredits;
    return Number(cgpa.toFixed(2));
  };

  const fetchResult = async () => {
    setError(null);
    setResult(null);
    setMessage(null);
    if (!token) {
      setError('Invalid result link');
      return;
    }
    if (!usn) {
      setError('Please enter your USN');
      return;
    }

    setLoading(true);
    try {
      const res = await publicViewResultByToken(token, usn.trim());
      if (!res || !res.success) {
        setError(res?.message || 'Failed to fetch result');
        setResult(null);
      } else {
        setResult(res);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const exportMarksCard = async () => {
    if (!result) {
      setMessage('No result to export');
      return;
    }
    setExporting(true);
    setMessage(null);
    try {
      // dynamic import to keep bundle small (html2canvas & jspdf are in deps)
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      if (!cardRef.current) {
        setMessage('Export failed: preview element missing');
        setExporting(false);
        return;
      }

      // ensure white background
      const canvas = await html2canvas(cardRef.current as HTMLElement, { backgroundColor: '#ffffff', scale: 2 });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgProps = (pdf as any).getImageProperties(imgData);
      const imgWidth = pageWidth - 20; // margin
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);
      const filename = `${(result.student?.usn || usn || 'marks')}_marks_card.pdf`;
      pdf.save(filename);
      setMessage('Exported marks card');
    } catch (e: any) {
      setMessage(e?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const passPercent = result ? calcPassPercent(result.marks || []) : null;
  // Prefer backend-provided CGPA when available, otherwise compute from marks
  const cgpa = result ? (result.aggregate?.cgpa ?? calcCGPA(result.marks || [])) : null;

  return (
    <div className="min-h-screen flex items-start justify-center bg-white py-8 px-4">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <img 
              src={result?.organization?.logo || "/logo.jpeg"} 
              alt={`${result?.organization?.name || 'College'} Logo`} 
              className="w-16 h-16 object-contain" 
            />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{result?.organization?.name || 'Neuro Campus'}</h1>
              <p className="text-xs text-gray-500">Official marks portal</p>
            </div>
          </div>
          <div className="text-sm text-gray-600 text-right">Secure public result view</div>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-700 font-medium">Instructions</div>
          <ul className="text-xs text-gray-600 mt-2 list-disc list-inside space-y-1">
            <li>Enter your USN exactly as on your ID (input will convert to UPPERCASE).</li>
            <li>Results shown are official. Use the export to download a marks card.</li>
            <li>Passing requires meeting the minimum criteria set by the {result?.organization?.name || 'examination board'}.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-start mb-4">
          <Input value={usn} onChange={(e: any) => setUsn(String(e.target.value).toUpperCase())} placeholder="Enter USN (e.g. 25CI003)" maxLength={20} className="bg-white text-gray-900 border border-gray-300" />
          <div className="flex-shrink-0">
            <Button onClick={fetchResult} disabled={loading}className="bg-indigo-600 hover:bg-indigo-700 text-white">{loading ? 'Loading...' : 'View'}</Button>
          </div>
        </div>

        {error && <div className="text-red-600 mb-4">{error}</div>}
        {message && <div className="text-sm text-gray-700 mb-4">{message}</div>}

        {result && result.success && (
          <div>
            {result.withheld ? (
              <div className="mb-6 p-6 bg-amber-50 border-l-4 border-amber-500 rounded">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⚠️</div>
                  <div>
                    <h3 className="text-lg font-semibold text-amber-800 mb-2">Result Withheld</h3>
                    <p className="text-amber-700">{result.message || 'Your result has been withheld by the examination authorities.'}</p>
                    <p className="text-sm text-amber-600 mt-3">Please contact the examination office for more information.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-600">{result.declared_on ? 'Declared on: ' + result.declared_on : 'Results declared'}</div>
                  <div className="flex items-center gap-2">
                    <Button onClick={exportMarksCard} disabled={exporting} className="bg-indigo-600 hover:bg-indigo-700 text-white">{exporting ? 'Exporting...' : 'Export PDF'}</Button>
                  </div>
                </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <div className="text-gray-700"><strong>Name:</strong> <span className="text-gray-900">{result.student?.name || '-'}</span></div>
                <div className="text-gray-700"><strong>USN:</strong> <span className="text-gray-900">{result.student?.usn || usn}</span></div>
              </div>
             
            </div>

            <div className="rounded-md overflow-hidden border border-gray-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse">
                  <thead>
                    <tr className="text-left">
                      <th className="p-2 border-b text-gray-700">Subject Code</th>
                      <th className="p-2 border-b text-gray-700">Subject Title</th>
                      <th className="p-2 border-b text-gray-700 text-right">CIE</th>
                      <th className="p-2 border-b text-gray-700 text-right">SEE</th>
                      <th className="p-2 border-b text-gray-700 text-right">Total Marks</th>
                      <th className="p-2 border-b text-gray-700">Result</th>
                      <th className="p-2 border-b text-gray-700">Grade</th>
                      <th className="p-2 border-b text-gray-700">Grade Point</th>
                      <th className="p-2 border-b text-gray-700">Credits Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(result.marks) && result.marks.length > 0 ? (
                      result.marks.map((m: {subject: string, subject_code: string, cie?: number, see?: number, total?: number, status: string, credits?: number, credit?: number, credit_hours?: number, creditHours?: number, credit_hour?: number}, idx: number) => {
                        // Calculate grade and grade points based on total marks
                        const total = m.total;
                        let grade = '';
                        let gradePoints = '';
                        if (typeof total === 'number') {
                          if (total >= 90) { grade = 'S'; gradePoints = '10'; }
                          else if (total >= 80) { grade = 'A'; gradePoints = '9'; }
                          else if (total >= 70) { grade = 'B'; gradePoints = '8'; }
                          else if (total >= 60) { grade = 'C'; gradePoints = '7'; }
                          else if (total >= 50) { grade = 'D'; gradePoints = '6'; }
                          else if (total >= 40) { grade = 'E'; gradePoints = '5'; }
                          else { grade = 'F'; gradePoints = '0'; }
                        }
                        
                        // Determine credits based on pass/fail status
                        const availableCredits = m.credits ?? m.credit ?? m.credit_hours ?? m.creditHours ?? m.credit_hour ?? 0;
                        const credits = m.status === 'pass' ? availableCredits : 0;
                        
                        return (
                        <tr key={idx} className="odd:bg-gray-50 even:bg-white">
                          <td className="p-2 text-gray-900">{m.subject_code}</td>
                          <td className="p-2 text-gray-900">{m.subject}</td>
                          <td className="p-2 text-gray-900 text-right">{m.cie ?? '-'}</td>
                          <td className="p-2 text-gray-900 text-right">{m.see ?? '-'}</td>
                          <td className="p-2 text-gray-900 text-right">{m.total ?? '-'}</td>
                          <td className={m.status === 'pass' ? 'p-2 text-green-600 font-medium' : 'p-2 text-red-600 font-medium'}>{m.status?.toUpperCase() ?? '-'}</td>
                          <td className="p-2 text-gray-900">{grade}</td>
                          <td className="p-2 text-gray-900">{gradePoints}</td>
                          <td className="p-2 text-gray-900">{credits}</td>
                        </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="p-2 text-gray-600" colSpan={9}>No marks available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-gray-700"><strong>Total Marks:</strong> <span className="text-gray-900">{result.aggregate?.total_marks ?? '-'}</span></div>
              <div className="text-gray-700"><strong>CGPA:</strong> <span className="text-gray-900">{cgpa ?? '-'}</span></div>
              <div className="text-gray-700"><strong>Overall Status:</strong> <span className={result.aggregate?.overall_status === 'pass' ? 'text-green-600' : 'text-red-600'}> {result.aggregate?.overall_status ?? '-'}</span></div>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded text-sm text-gray-700">
              <strong>Notes:</strong>
              <div className="text-xs text-gray-600 mt-1">This is a provisional marks card issued for reference. The official marks card will be issued by the Administration in due course. The results and marks indicated are accurate and officially recognized.</div>
            </div>

            <div style={{ position: 'absolute', left: -9999, top: 0 }}>
              <div ref={cardRef as any} style={{ width: 800, padding: 20, background: '#fff', color: '#000' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img 
                    src={result?.organization?.logo || "/logo.jpeg"} 
                    alt="Logo" 
                    style={{ width: 80, height: 80, objectFit: 'contain' }} 
                  />
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{result?.organization?.name || 'Neuro Campus'}</div>
                    <div style={{ fontSize: 12 }}>Official Marks Card</div>
                  </div>
                </div>
                <hr style={{ margin: '12px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div><strong>Name:</strong> {result.student?.name || '-'}</div>
                  <div><strong>USN:</strong> {result.student?.usn || usn}</div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: 6 }}>Subject Code</th>
                      <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: 6 }}>Subject Title</th>
                      <th style={{ borderBottom: '1px solid #ddd', textAlign: 'right', padding: 6 }}>CIE</th>
                      <th style={{ borderBottom: '1px solid #ddd', textAlign: 'right', padding: 6 }}>SEE</th>
                      <th style={{ borderBottom: '1px solid #ddd', textAlign: 'right', padding: 6 }}>Total Marks</th>
                      <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: 6 }}>Result</th>
                      <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: 6 }}>Grade</th>
                      <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: 6 }}>Grade Point</th>
                      <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: 6 }}>Credits Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(result.marks) && result.marks.map((m: {subject: string, subject_code: string, cie?: number, see?: number, total?: number, status: string, credits?: number, credit?: number, credit_hours?: number, creditHours?: number, credit_hour?: number}, i: number) => {
                      // Calculate grade and grade points based on total marks
                      const total = m.total;
                      let grade = '';
                      let gradePoints = '';
                      if (typeof total === 'number') {
                        if (total >= 90) { grade = 'S'; gradePoints = '10'; }
                        else if (total >= 80) { grade = 'A'; gradePoints = '9'; }
                        else if (total >= 70) { grade = 'B'; gradePoints = '8'; }
                        else if (total >= 60) { grade = 'C'; gradePoints = '7'; }
                        else if (total >= 50) { grade = 'D'; gradePoints = '6'; }
                        else if (total >= 40) { grade = 'E'; gradePoints = '5'; }
                        else { grade = 'F'; gradePoints = '0'; }
                      }
                      
                      // Determine credits based on pass/fail status
                      const availableCredits = m.credits ?? m.credit ?? m.credit_hours ?? m.creditHours ?? m.credit_hour ?? 0;
                      const credits = m.status === 'pass' ? availableCredits : 0;
                      
                      return (
                      <tr key={i}>
                        <td style={{ padding: 6 }}>{m.subject_code}</td>
                        <td style={{ padding: 6 }}>{m.subject}</td>
                        <td style={{ padding: 6, textAlign: 'right' }}>{m.cie ?? '-'}</td>
                        <td style={{ padding: 6, textAlign: 'right' }}>{m.see ?? '-'}</td>
                        <td style={{ padding: 6, textAlign: 'right' }}>{m.total ?? '-'}</td>
                        <td style={{ padding: 6 }}>{m.status?.toUpperCase() ?? '-'}</td>
                        <td style={{ padding: 6 }}>{grade}</td>
                        <td style={{ padding: 6 }}>{gradePoints}</td>
                        <td style={{ padding: 6 }}>{credits}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                <table style={{ width: '100%', marginTop: 10, borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: 6, fontWeight: 'bold', textAlign: 'right' }}>Total Credits Earned:</td>
                      <td style={{ padding: 6, fontWeight: 'bold' }}>
                        {(result.marks || []).reduce((acc: number, m: {status: string, credits?: number, credit?: number, credit_hours?: number, creditHours?: number, credit_hour?: number}) => {
                          const availableCredits = m.credits ?? m.credit ?? m.credit_hours ?? m.creditHours ?? m.credit_hour ?? 0;
                          const credits = m.status === 'pass' ? availableCredits : 0;
                          return acc + credits;
                        }, 0)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: 6, fontWeight: 'bold', textAlign: 'right' }}>Total Marks Obtained:</td>
                      <td style={{ padding: 6, fontWeight: 'bold' }}>
                        {(result.marks || []).reduce((acc: number, m: {total?: number}) => {
                          return acc + (typeof m.total === 'number' ? m.total : 0);
                        }, 0)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: 6, fontWeight: 'bold', textAlign: 'right' }}>SGPA:</td>
                      <td style={{ padding: 6, fontWeight: 'bold' }}>
                        {(() => {
                          const marks = result.marks || [];
                          let totalGradePoints = 0;
                          let totalCredits = 0;
                          
                          marks.forEach((m: {total?: number, credits?: number, credit?: number, credit_hours?: number, creditHours?: number, credit_hour?: number, status: string}) => {
                            const total = m.total;
                            const credits = m.credits ?? m.credit ?? m.credit_hours ?? m.creditHours ?? m.credit_hour ?? 0;
                            
                            if (typeof total === 'number' && credits > 0 && m.status === 'pass') {
                              let gradePoints = 0;
                              if (total >= 90) gradePoints = 10;
                              else if (total >= 80) gradePoints = 9;
                              else if (total >= 70) gradePoints = 8;
                              else if (total >= 60) gradePoints = 7;
                              else if (total >= 50) gradePoints = 6;
                              else if (total >= 40) gradePoints = 5;
                              else gradePoints = 0;
                              
                              totalGradePoints += gradePoints * credits;
                              totalCredits += credits;
                            }
                          });
                          
                          return totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
                        })()}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: 6, fontWeight: 'bold', textAlign: 'right' }}>CGPA:</td>
                      <td style={{ padding: 6, fontWeight: 'bold' }}>{cgpa ?? '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: 6, fontWeight: 'bold', textAlign: 'right' }}>Overall Status:</td>
                      <td style={{ padding: 6, fontWeight: 'bold' }}>{result.aggregate?.overall_status ?? '-'}</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ marginTop: 18, fontSize: 11 }}>This is an official marks card generated from {result?.organization?.name || 'Neuro Campus'}.</div>
              </div>
            </div>
          </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}

export default ResultsView
