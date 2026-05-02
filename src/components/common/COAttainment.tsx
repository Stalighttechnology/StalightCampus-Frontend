import React, { useEffect, useState } from 'react'

type CoResult = {
  co: string
  max_marks: number
  avg_marks: number
  avg_pct: number
  students_above_target: number
  pct_students_above_target: number
  attainment_level: number
  total_students: number
}

export default function COAttainment({ questionPaperId }: { questionPaperId?: number }) {
  const [data, setData] = useState<{ total_students: number; results: CoResult[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!questionPaperId) return
    setLoading(true)
    fetch(`/api/co-attainment/?question_paper=${questionPaperId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        setData({ total_students: json.total_students, results: json.results })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [questionPaperId])

  if (!questionPaperId) return <div>Please provide a question paper id.</div>
  if (loading) return <div>Loading CO attainment...</div>
  if (error) return <div>Error: {error}</div>
  if (!data) return null

  return (
    <div>
      <h3>CO Attainment (QP {questionPaperId})</h3>
      <div>Total students: {data.total_students}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: 6 }}>CO</th>
            <th style={{ border: '1px solid #ddd', padding: 6 }}>Max Marks</th>
            <th style={{ border: '1px solid #ddd', padding: 6 }}>Avg Marks</th>
            <th style={{ border: '1px solid #ddd', padding: 6 }}>% Avg</th>
            <th style={{ border: '1px solid #ddd', padding: 6 }}>% Students ≥ Target</th>
            <th style={{ border: '1px solid #ddd', padding: 6 }}>Attainment Level</th>
          </tr>
        </thead>
        <tbody>
          {data.results.map((r) => (
            <tr key={r.co}>
              <td style={{ border: '1px solid #eee', padding: 6 }}>{r.co}</td>
              <td style={{ border: '1px solid #eee', padding: 6 }}>{r.max_marks}</td>
              <td style={{ border: '1px solid #eee', padding: 6 }}>{r.avg_marks}</td>
              <td style={{ border: '1px solid #eee', padding: 6 }}>{r.avg_pct}%</td>
              <td style={{ border: '1px solid #eee', padding: 6 }}>{r.pct_students_above_target}%</td>
              <td style={{ border: '1px solid #eee', padding: 6 }}>{r.attainment_level}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
