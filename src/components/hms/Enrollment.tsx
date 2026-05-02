import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '../../hooks/use-toast';
import { 
  UserPlus, 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  MapPin, 
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useHMSContext } from "../../context/HMSContext";
import { SkeletonForm, SkeletonPageHeader } from "../ui/skeleton";

const Enrollment: React.FC = () => {
  const [enrollmentType, setEnrollmentType] = useState<'warden' | 'caretaker'>('warden');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    experience: '',
    department: '',
    address: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { skeletonMode } = useHMSContext();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const endpoint = enrollmentType === 'warden' 
        ? '/api/hms/wardens/' 
        : '/api/hms/caretakers/';

      const payload = enrollmentType === 'warden'
        ? {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            designation: formData.designation,
            experience: parseInt(formData.experience) || 0,
            address: formData.address,
          }
        : {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            experience: parseInt(formData.experience) || 0,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `${enrollmentType === 'warden' ? 'Warden' : 'Caretaker'} enrolled successfully`,
        });
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          designation: '',
          experience: '',
          department: '',
          address: '',
        });
      } else {
        const errorData = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: errorData.detail || `Failed to enroll ${enrollmentType}`,
        });
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error while enrolling",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle skeleton loading inline for better context visibility
  const isSkeleton = skeletonMode;

  return (
    <div className="space-y-8">
      <Card className="border-primary/10 shadow-xl overflow-hidden">
        <CardHeader className="bg-muted/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>
                Enrollment Form
              </CardTitle>
              <CardDescription>Fill in the professional details of the staff member.</CardDescription>
            </div>
            <div className="flex w-full md:w-auto bg-background p-1 rounded-lg border shadow-sm">
              <button 
                onClick={() => setEnrollmentType('warden')}
                className={`flex-1 md:flex-none px-6 py-2 text-xs font-bold rounded-md transition-all duration-200 ${enrollmentType === 'warden' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
              >
                WARDEN
              </button>
              <button 
                onClick={() => setEnrollmentType('caretaker')}
                className={`flex-1 md:flex-none px-6 py-2 text-xs font-bold rounded-md transition-all duration-200 ${enrollmentType === 'caretaker' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
              >
                CARETAKER
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-2 uppercase tracking-widest">
                  <User className="w-4 h-4" /> Personal info
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    {isSkeleton ? (
                      <div className="pl-10 h-11 w-full rounded-md border bg-muted animate-pulse" />
                    ) : (
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g. John Doe"
                        className="pl-10 h-11"
                        required
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    {isSkeleton ? (
                      <div className="pl-10 h-11 w-full rounded-md border bg-muted animate-pulse" />
                    ) : (
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="john@university.edu"
                        className="pl-10 h-11"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Contact Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    {isSkeleton ? (
                      <div className="pl-10 h-11 w-full rounded-md border bg-muted animate-pulse" />
                    ) : (
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+91 XXXXX XXXXX"
                        className="pl-10 h-11"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Professional Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-2 uppercase tracking-widest">
                  <Briefcase className="w-4 h-4" /> Professional info
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    {isSkeleton ? (
                      <div className="pl-10 h-11 w-full rounded-md border bg-muted animate-pulse" />
                    ) : (
                      <Input
                        id="experience"
                        name="experience"
                        type="number"
                        value={formData.experience}
                        onChange={handleInputChange}
                        placeholder="0"
                        min="0"
                        className="pl-10 h-11"
                      />
                    )}
                  </div>
                </div>

                {enrollmentType === 'warden' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="designation">Designation</Label>
                      <div className="relative">
                        <Badge className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px]" variant="secondary">Warden</Badge>
                        {isSkeleton ? (
                          <div className="h-11 w-full rounded-md border bg-muted animate-pulse" />
                        ) : (
                          <Input
                            id="designation"
                            name="designation"
                            value={formData.designation}
                            onChange={handleInputChange}
                            placeholder="e.g. Senior Warden"
                            className="h-11"
                          />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Permanent Address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        {isSkeleton ? (
                          <div className="w-full h-[60px] rounded-md border bg-muted animate-pulse" />
                        ) : (
                          <textarea
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="Complete residential address..."
                            className="w-full pl-10 pr-3 py-2 text-sm border rounded-md focus:ring-1 focus:ring-primary outline-none min-h-[60px] resize-none custom-scrollbar"
                          />
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="address">Permanent Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      {isSkeleton ? (
                        <div className="w-full h-[108px] rounded-md border bg-muted animate-pulse" />
                      ) : (
                        <textarea
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="Complete residential address..."
                          className="w-full pl-10 pr-3 py-2 text-sm border rounded-md focus:ring-1 focus:ring-primary outline-none min-h-[108px] resize-none custom-scrollbar"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-muted/20 p-6 rounded-xl border border-dashed">
              <div className="hidden md:flex items-center gap-4">
                <div className="bg-green-500/20 p-3 rounded-full">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Ready to Onboard</p>
                </div>
              </div>
              {isSkeleton ? (
                <div className="w-full md:w-[160px] h-12 rounded-md bg-muted animate-pulse" />
              ) : (
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full md:w-auto h-12 px-8 bg-primary hover:bg-primary/90 font-semibold group"
                >
                  {isLoading ? 'Processing...' : `Enroll ${enrollmentType === 'warden' ? 'Warden' : 'Caretaker'}`}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Enrollment;
