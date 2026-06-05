import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';

export default function AdmissionSeatMatrix() {
  const [seatMatrix, setSeatMatrix] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeatMatrix();
  }, []);

  const fetchSeatMatrix = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/seat-matrix/`);
      if (response.ok) {
        const data = await response.json();
        setSeatMatrix(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Seat Matrix</h2>
          <p className="text-muted-foreground text-sm">Monitor seat allocations and availability per course branch.</p>
        </div>
        <Button disabled className="shadow-sm">
          <Plus size={16} className="mr-2" /> Allocate Seats
        </Button>
      </div>

      <div className="grid gap-6">
        {seatMatrix.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <p className="mb-4">No seat matrix records found.</p>
              <p className="text-sm">Seats are automatically tracked when students are enrolled via the Applications tab.</p>
            </CardContent>
          </Card>
        ) : (
          seatMatrix.map(matrix => {
            const fillPercentage = Math.round((matrix.filled_seats / matrix.total_capacity) * 100);
            return (
              <Card key={matrix.id} className="border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">{matrix.branch_name}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" disabled className="h-8 w-8"><Edit size={16}/></Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-muted/30 rounded-lg text-center border">
                      <p className="text-xs text-muted-foreground uppercase mb-1 font-semibold">Total Capacity</p>
                      <p className="text-2xl font-bold text-foreground">{matrix.total_capacity}</p>
                    </div>
                    <div className="p-4 bg-primary/10 rounded-lg text-center border border-primary/20">
                      <p className="text-xs text-primary uppercase font-bold mb-1">Filled</p>
                      <p className="text-2xl font-bold text-primary">{matrix.filled_seats}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg text-center border">
                      <p className="text-xs text-muted-foreground uppercase mb-1 font-semibold">Merit Quota</p>
                      <p className="text-xl font-bold text-foreground">{matrix.merit_quota}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg text-center border">
                      <p className="text-xs text-muted-foreground uppercase mb-1 font-semibold">Management Quota</p>
                      <p className="text-xl font-bold text-foreground">{matrix.management_quota}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Occupancy</span>
                      <span>{fillPercentage}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${fillPercentage}%` }}></div>
                    </div>
                    <p className="text-xs text-muted-foreground text-right mt-1">
                      {matrix.total_capacity - matrix.filled_seats} seats remaining
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
