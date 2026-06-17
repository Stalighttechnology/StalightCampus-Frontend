import React, { useState, useEffect } from 'react'
import ReCAPTCHA from "react-google-recaptcha"
import { useParams, useLocation } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { publicViewResultByToken, publicOrganizationInfoByToken, publicExportResultPDF } from '@/utils/coe_api'
import { useTheme } from '@/context/ThemeContext'
import { ArrowLeft, Loader2 } from 'lucide-react'

const ResultsView: React.FC = () => {
  const { theme } = useTheme();
  const { token: paramToken } = useParams<{ token: string }>();
  const location = useLocation();
  // Accept token from route param or query string (?token=...)
  const q = new URLSearchParams(location.search);
  const token = paramToken || q.get('token') || '';
  const resultType = q.get('type') || '';
  const [usn, setUsn] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [orgInfo, setOrgInfo] = useState<{ name: string; logo: string | null } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Fetch organization information on mount/token change
  useEffect(() => {
    if (token) {
      publicOrganizationInfoByToken(token).then((res) => {
        if (res && res.success && res.organization) {
          setOrgInfo(res.organization);
        }
      }).catch(err => console.error("Failed to fetch organization info:", err));
    }
  }, [token]);

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
    if (!recaptchaToken) {
      setError('Please complete the captcha verification.');
      return;
    }
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
      const res = await publicViewResultByToken(token, usn.trim(), recaptchaToken, resultType);
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
      const response = await publicExportResultPDF(token, result.student?.usn || usn, resultType);
      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `${(result.student?.usn || usn || 'marks')}_provisional_marks_card.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 1500);
      
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
    <div className="min-h-screen w-full bg-slate-50/50 dark:bg-zinc-950 flex flex-col items-center justify-start p-3 sm:p-6">
      <div className={`${result ? 'my-4 sm:my-8 max-w-3xl' : 'my-auto max-w-2xl'} w-full bg-card border border-border shadow-xl rounded-2xl p-5 sm:p-8 relative overflow-hidden`}>

        <div className="flex flex-row items-center justify-between gap-4 mb-4 sm:mb-6 pt-1 sm:pt-2 overflow-x-auto thin-scrollbar pb-1">
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="p-1 rounded-xl border bg-white dark:bg-zinc-900 shadow-sm shrink-0">
              <img
                src={result?.organization?.logo || orgInfo?.logo || "/logo.jpeg"}
                alt={`${result?.organization?.name || orgInfo?.name || 'College'} Logo`}
                className="w-10 h-10 sm:w-14 sm:h-14 object-contain"
              />
            </div>
            <div>
              <h1 className="text-base sm:text-2xl font-semibold tracking-tight text-foreground">{result?.organization?.name || orgInfo?.name || 'College'}</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5">Official marks portal</p>
            </div>
          </div>
          <div className="text-xs sm:text-sm text-right flex flex-col items-end gap-1.5 sm:gap-2 shrink-0">
            <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-secondary text-secondary-foreground border border-border">
              Secure Public Result View
            </span>
            {result && (
              <Button
                onClick={() => { setResult(null); setUsn(''); setRecaptchaToken(null); }}
                variant="outline"
                className="text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 border-border hover:bg-accent text-foreground transition-all flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Search Another USN
              </Button>
            )}
          </div>
        </div>

        {/* Instructions Card */}
        <div className="mb-4 p-3 sm:p-4 bg-primary/5 border border-primary/10 rounded-xl">
          <div className="text-xs sm:text-sm text-primary font-semibold tracking-wide uppercase">Instructions</div>
          <ul className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 list-disc list-inside space-y-1 sm:space-y-1.5 leading-relaxed">
            <li>Enter your USN exactly as on your ID (input will convert to UPPERCASE).</li>
            <li>Results shown are official. Use the export to download a marks card.</li>
            <li>Passing requires meeting the minimum criteria set by the {result?.organization?.name || orgInfo?.name || 'examination board'}.</li>
          </ul>
        </div>

        {/* Search / Input form */}
        {!result && (
          <div className="flex flex-col gap-4 mb-2">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch w-full">
              <Input
                value={usn}
                onChange={(e: any) => setUsn(String(e.target.value).toUpperCase())}
                placeholder="Enter USN (e.g. 25CI003)"
                maxLength={20}
                className="h-11 sm:h-12 bg-background text-foreground border border-input rounded-xl focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 transition-all"
              />
              <Button
                onClick={fetchResult}
                disabled={loading || !recaptchaToken}
                className="bg-primary hover:bg-primary/90 text-white h-11 sm:h-12 rounded-xl px-6 font-semibold shadow-sm transition-all duration-200 active:scale-[0.98] w-full sm:w-auto shrink-0"
              >
                {loading ? 'Loading...' : 'View Results'}
              </Button>
            </div>
            <div className="flex flex-col items-center justify-center p-3 border rounded-xl bg-muted/20 border-border/60">
              <ReCAPTCHA
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
                onChange={(token: string | null) => setRecaptchaToken(token)}
                theme={theme === 'dark' ? 'dark' : 'light'}
              />
              {import.meta.env.DEV && (
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => setRecaptchaToken("bypass")}
                    className="text-[11px] text-primary font-semibold underline hover:text-primary/80 transition-colors"
                  >
                    Bypass Captcha (Dev Only)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-destructive/10 text-destructive text-sm font-semibold border border-destructive/20">
            {error}
          </div>
        )}
        {message && (
          <div className="p-3 mb-4 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium border border-border">
            {message}
          </div>
        )}

        {/* Results display */}
        {result && result.success && (
          <div>
            {result.withheld ? (
              <div className="mb-6 p-6 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-start gap-3.5">
                  <div className="text-3xl leading-none select-none">⚠️</div>
                  <div>
                    <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-1.5">Result Withheld</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{result.message || 'Your result has been withheld by the examination authorities.'}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-3">Please contact the examination office for more information.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                  <div className="text-xs font-medium text-muted-foreground">
                    {result.declared_on ? 'Declared on: ' + result.declared_on : 'Results declared'}
                  </div>
                  <Button
                    onClick={exportMarksCard}
                    disabled={exporting}
                    className="bg-primary hover:bg-primary/90 text-white h-10 rounded-xl px-5 font-semibold shadow-sm transition-all duration-200 active:scale-[0.98] w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    {exporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      'Export PDF'
                    )}
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/10 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground font-medium w-16">Name:</span>
                    <span className="font-semibold text-foreground">{result.student?.name || '-'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground font-medium w-16">USN:</span>
                    <span className="font-semibold text-foreground">{result.student?.usn || usn}</span>
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden border border-border bg-card shadow-sm">
                  <div className="overflow-x-auto thin-scrollbar">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <th className="p-3">Subject Code</th>
                          <th className="p-3">Subject Title</th>
                          <th className="p-3 text-right">CIE</th>
                          <th className="p-3 text-right">SEE</th>
                          <th className="p-3 text-right">Total</th>
                          <th className="p-3">Result</th>
                          <th className="p-3 text-center">Grade</th>
                          <th className="p-3 text-center">GP</th>
                          <th className="p-3 text-center">Credits</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {Array.isArray(result.marks) && result.marks.length > 0 ? (
                          result.marks.map((m: any, idx: number) => {
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

                            const availableCredits = m.credits ?? m.credit ?? m.credit_hours ?? m.creditHours ?? m.credit_hour ?? 0;
                            const credits = m.status === 'pass' ? availableCredits : 0;

                            return (
                              <tr key={idx} className="hover:bg-muted/10 transition-colors">
                                <td className="p-3 font-mono font-medium text-foreground">{m.subject_code}</td>
                                <td className="p-3 font-medium text-foreground">{m.subject}</td>
                                <td className="p-3 text-right text-foreground">{m.cie ?? '-'}</td>
                                <td className="p-3 text-right text-foreground">{m.see ?? '-'}</td>
                                <td className="p-3 text-right font-semibold text-foreground">{m.total ?? '-'}</td>
                                <td className="p-3">
                                  <Badge className={`capitalize font-semibold text-xs px-2.5 py-0.5 rounded-full border shadow-sm ${m.status === 'pass'
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400'
                                    : 'bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20'
                                    }`} variant="outline">
                                    {m.status?.toUpperCase() ?? '-'}
                                  </Badge>
                                </td>
                                <td className="p-3 text-center font-semibold text-foreground">{grade}</td>
                                <td className="p-3 text-center font-semibold text-foreground">{gradePoints}</td>
                                <td className="p-3 text-center font-semibold text-foreground">{credits}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td className="p-4 text-center text-muted-foreground" colSpan={9}>No marks available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/20 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm font-semibold">
                  <div className="flex justify-between sm:justify-start gap-2">
                    <span className="text-muted-foreground font-medium">Total Marks:</span>
                    <span className="text-foreground font-semibold">{result.aggregate?.total_marks ?? '-'}</span>
                  </div>
                  <div className="flex justify-between sm:justify-start gap-2">
                    <span className="text-muted-foreground font-medium">CGPA:</span>
                    <span className="text-foreground font-semibold">{cgpa ?? '-'}</span>
                  </div>
                  <div className="flex justify-between sm:justify-start gap-2">
                    <span className="text-muted-foreground font-medium">Overall Status:</span>
                    <Badge className={`capitalize font-semibold text-xs px-3 py-1 rounded-lg border shadow-sm ${result.aggregate?.overall_status === 'pass'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : 'bg-destructive/10 text-destructive border-destructive/20'
                      }`} variant="outline">
                      {result.aggregate?.overall_status ?? '-'}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-amber-600 dark:text-amber-400 font-semibold block mb-1">Notes:</strong>
                  This is a provisional marks card issued for reference. The official marks card will be issued by the Administration in due course. The results and marks indicated are accurate and officially recognized.
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
