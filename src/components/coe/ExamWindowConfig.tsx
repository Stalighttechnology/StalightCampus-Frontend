import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";

interface ExamWindowConfigProps {
  batchId: string;
  examPeriod: string;
  branchId?: string; // Optional, to apply to all branches if not provided
  semesterId: string;
}

const ExamWindowConfig: React.FC<ExamWindowConfigProps> = ({ batchId, examPeriod, branchId, semesterId }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (batchId && examPeriod && semesterId) {
      fetchWindowConfig();
    }
  }, [batchId, examPeriod, branchId, semesterId]);

  const fetchWindowConfig = async () => {
    try {
      setFetching(true);
      const params = new URLSearchParams({
        batch: batchId,
        exam_period: examPeriod,
        semester: semesterId,
      });
      if (branchId && branchId !== 'all') {
        params.append('branch', branchId);
      }
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/exam-window/?${params.toString()}`);
      if (!response.ok) {
        if (response.status === 404) {
          setStartDate('');
          setEndDate('');
        } else {
          console.error("Error fetching exam window", response.status);
        }
        return;
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        // format to datetime-local expected format (YYYY-MM-DDTHH:MM)
        const start = new Date(data.data.start_date);
        const end = new Date(data.data.end_date);
        setStartDate(start.toISOString().slice(0, 16));
        setEndDate(end.toISOString().slice(0, 16));
      }
    } catch (error: any) {
      console.error("Error fetching exam window", error);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!startDate || !endDate) {
      toast.error("Please provide both start and end dates.");
      return;
    }
    
    if (new Date(startDate) >= new Date(endDate)) {
      toast.error("Start date must be before end date.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        batch: batchId,
        exam_period: examPeriod,
        semester: semesterId,
        branch: branchId === 'all' ? undefined : branchId,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
      };

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/exam-window/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Exam application window configured successfully.");
        fetchWindowConfig();
      } else {
        toast.error(data.message || "Failed to configure exam window.");
      }
    } catch (error: any) {
      toast.error("Error configuring exam window");
    } finally {
      setLoading(false);
    }
  };

  if (!batchId || !examPeriod || !semesterId) {
    return null;
  }

  return (
    <Card className="mt-6 border-blue-200 bg-blue-50/50">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Exam Application Window Configuration</h3>
        <p className="text-sm text-blue-700 mb-4">
          Define the dates during which HODs and Faculty can submit student exam applications for this selection.
          {(!branchId || branchId === 'all') && " (Applying to ALL branches at once)"}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Window Start Date & Time</Label>
            <Input 
              type="datetime-local" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              disabled={fetching}
            />
          </div>
          <div className="space-y-2">
            <Label>Window End Date & Time</Label>
            <Input 
              type="datetime-local" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              disabled={fetching}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={loading || fetching} className="bg-blue-600 hover:bg-blue-700">
            {loading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExamWindowConfig;
