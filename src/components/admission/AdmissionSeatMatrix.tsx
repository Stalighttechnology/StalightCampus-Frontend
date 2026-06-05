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
    return (
      <Card className="w-full animate-pulse border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div className="space-y-2">
            <div className="h-6 w-32 bg-muted rounded" />
            <div className="h-3.5 w-80 bg-muted rounded" />
          </div>
          <div className="h-9 w-28 bg-muted rounded" />
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border rounded-xl p-4 bg-muted/5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <div className="h-5 w-40 bg-muted rounded" />
                <div className="h-8 w-8 bg-muted rounded-full" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="space-y-2">
                    <div className="h-3 w-16 bg-muted rounded" />
                    <div className="h-5 w-24 bg-muted rounded" />
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <div className="h-3 w-12 bg-muted rounded" />
                  <div className="h-3 w-8 bg-muted rounded" />
                </div>
                <div className="w-full bg-muted h-3 rounded-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="admission-seat-matrix-container" className="w-full">
      <CardHeader id="admission-seat-matrix-header" className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
        <div>
          <CardTitle className="text-lg md:text-xl font-semibold">Seat Matrix</CardTitle>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">Monitor seat allocations and availability per course branch.</p>
        </div>
        <Button disabled size="sm" className="shadow-sm">
          <Plus size={16} className="mr-2" /> Allocate Seats
        </Button>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {seatMatrix.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <p className="mb-4">No seat matrix records found.</p>
            <p className="text-sm">Seats are automatically tracked when students are enrolled via the Applications tab.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {seatMatrix.map(matrix => {
              const fillPercentage = Math.round((matrix.filled_seats / matrix.total_capacity) * 100);
              return (
                <div key={matrix.id} className="border border-border rounded-xl p-4 bg-muted/5">
                  <div className="flex flex-row items-center justify-between pb-4 border-b">
                    <h3 className="text-base font-semibold text-foreground">{matrix.branch_name}</h3>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" disabled className="h-8 w-8"><Edit size={16}/></Button>
                    </div>
                  </div>
                  <div className="pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-card rounded-lg text-center border">
                        <p className="text-xs text-muted-foreground uppercase mb-1 font-semibold">Total Capacity</p>
                        <p className="text-2xl font-bold text-foreground">{matrix.total_capacity}</p>
                      </div>
                      <div className="p-4 bg-primary/10 rounded-lg text-center border border-primary/20">
                        <p className="text-xs text-primary uppercase font-bold mb-1">Filled</p>
                        <p className="text-2xl font-bold text-primary">{matrix.filled_seats}</p>
                      </div>
                      <div className="p-4 bg-card rounded-lg text-center border">
                        <p className="text-xs text-muted-foreground uppercase mb-1 font-semibold">Merit Quota</p>
                        <p className="text-xl font-bold text-foreground">{matrix.merit_quota}</p>
                      </div>
                      <div className="p-4 bg-card rounded-lg text-center border">
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
