import { useState, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { User as UserIcon, Mail, Phone, MapPin, Building, Calendar, Briefcase, Activity } from "lucide-react";
import { API_BASE_URL } from "@/utils/config";
import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";
import { useTheme } from "../../context/ThemeContext";

const TECH_STACKS = [
  { id: "frontend", label: "Frontend" },
  { id: "backend", label: "Backend" },
  { id: "full_stack", label: "Full Stack" },
  { id: "devops", label: "DevOps" },
  { id: "mobile", label: "Mobile / App" },
  { id: "qa", label: "QA & Testing" },
  { id: "ui_ux", label: "UI/UX Design" }
];

const DeveloperProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/developer/profile/`, {
          headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
        });
        const data = await response.json();
        if (data.profile) {
          setProfile(data.profile);
        }
      } catch (error) {
        console.error("Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Profile not found.</div>;
  }

  const displayName = profile.full_name || `${profile.first_name} ${profile.last_name}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      {/* Header Profile Section */}
      <Card className="border-0 shadow-sm overflow-hidden bg-background">
        <div className="bg-indigo-600/10 dark:bg-indigo-500/10 px-6 py-12 flex flex-col items-center border-b border-indigo-100 dark:border-indigo-900/50 relative">
          <div className="absolute top-4 right-4">
            <span className={`px-4 py-1.5 rounded-full text-xs font-semibold ${profile.role ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
              {profile.role || 'Developer'}
            </span>
          </div>
          
          <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 shadow-md ring-4 ring-indigo-50 dark:ring-indigo-900/20">
            <UserIcon className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
          </div>
          
          <h1 className="text-3xl font-bold text-center text-foreground mt-2">
            {displayName}
          </h1>
          <p className="text-muted-foreground mt-1 text-center font-medium">
            {profile.designation || 'Developer'} {profile.department ? `• ${profile.department}` : ''}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Details Card */}
        <Card className="border border-border/50 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-indigo-500" />
              <h3 className="text-lg font-semibold tracking-tight">Contact Information</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Email Address</p>
                <p className="text-sm font-medium">{profile.email}</p>
              </div>
              
              {profile.phone && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Phone Number</p>
                  <p className="text-sm font-medium">{profile.phone}</p>
                </div>
              )}
              
              {profile.address && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Address</p>
                  <p className="text-sm font-medium leading-relaxed">{profile.address}</p>
                </div>
              )}

              {profile.emergency_contact && (
                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs font-medium text-red-500/80 dark:text-red-400/80 uppercase tracking-wider mb-1">Emergency Contact</p>
                  <p className="text-sm font-medium">{profile.emergency_contact}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Professional Details Card */}
        <div className="space-y-6">
          <Card className="border border-border/50 shadow-sm h-fit">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-semibold tracking-tight">Employment Details</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {profile.employee_intern_id && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Employee ID</p>
                    <div className="flex items-center text-sm font-medium">
                      <Building className="w-4 h-4 mr-2 text-muted-foreground" />
                      {profile.employee_intern_id}
                    </div>
                  </div>
                )}
                
                {profile.date_of_joining && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Date of Joining</p>
                    <div className="flex items-center text-sm font-medium">
                      <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                      {profile.date_of_joining}
                    </div>
                  </div>
                )}
                
                {!profile.date_of_joining && profile.date_joined && (
                   <div>
                     <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Account Created</p>
                     <div className="flex items-center text-sm font-medium">
                       <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                       {profile.date_joined}
                     </div>
                   </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assigned Tech Stack */}
          {profile.developer_skills && profile.developer_skills.length > 0 && (
            <Card className="border border-border/50 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-lg font-semibold tracking-tight">Assigned Tech Stack</h3>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {profile.developer_skills.map((s: string) => (
                    <span key={s} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 text-sm font-medium rounded-lg border border-indigo-100 dark:border-indigo-500/30">
                      {TECH_STACKS.find(ts => ts.id === s)?.label || s}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeveloperProfile;
