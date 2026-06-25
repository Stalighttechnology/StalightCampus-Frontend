import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";
import { Search, UserPlus, CheckCircle, ShieldAlert, Edit, Trash2, Eye, ChevronLeft, ChevronRight, User as UserIcon, Building, Phone, Calendar, Mail, MapPin } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../context/ThemeContext";
import { API_BASE_URL } from "@/utils/config";
import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "../../utils/sweetalert";

const TECH_STACKS = [
  { id: "frontend", label: "Frontend" },
  { id: "backend", label: "Backend" },
  { id: "full_stack", label: "Full Stack" },
  { id: "devops", label: "DevOps" },
  { id: "mobile", label: "Mobile / App" },
  { id: "qa", label: "QA & Testing" },
  { id: "ui_ux", label: "UI/UX Design" }
];

const EnrollDeveloper = () => {
  const [activeTab, setActiveTab] = useState<"pending" | "active">("pending");
  const [pendingNDAs, setPendingNDAs] = useState<any[]>([]);
  const [activeDevs, setActiveDevs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingTotalPages, setPendingTotalPages] = useState(1);
  
  const [activePage, setActivePage] = useState(1);
  const [activeTotalPages, setActiveTotalPages] = useState(1);
  
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedNDA, setSelectedNDA] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedDev, setSelectedDev] = useState<any>(null);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const { theme } = useTheme();

  const fetchPendingNDAs = async (page = 1) => {
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/developers/pending-nda/?page=${page}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
      });
      const data = await response.json();
      if (data.pending) {
        setPendingNDAs(data.pending);
        setPendingTotalPages(data.total_pages || 1);
      }
    } catch (e) {}
  };

  const fetchActiveDevs = async (page = 1) => {
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/developers/active/?page=${page}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
      });
      const data = await response.json();
      if (data.developers) {
        setActiveDevs(data.developers);
        setActiveTotalPages(data.total_pages || 1);
      }
    } catch (e) {}
  };

  useEffect(() => {
    setLoading(true);
    if (activeTab === "pending") {
      fetchPendingNDAs(pendingPage).finally(() => setLoading(false));
    } else {
      fetchActiveDevs(activePage).finally(() => setLoading(false));
    }
  }, [activeTab, pendingPage, activePage]);

  const handleEnrollClick = (nda: any) => {
    setSelectedNDA(nda);
    setPassword("");
    setSelectedSkills([]);
    setEnrollModalOpen(true);
  };

  const handleSkillToggle = (skillId: string) => {
    setSelectedSkills(prev => 
      prev.includes(skillId) ? prev.filter(s => s !== skillId) : [...prev, skillId]
    );
  };

  const submitEnrollment = async () => {
    if (!password || selectedSkills.length === 0) {
      showErrorAlert("Validation Error", "Password and at least one skill are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/developers/enroll/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nda_id: selectedNDA.id,
          password: password,
          developer_skills: selectedSkills
        })
      });
      
      if (response.ok) {
        setEnrollModalOpen(false);
        fetchPendingNDAs(pendingPage);
        showSuccessAlert("Success", "Developer enrolled successfully!");
      } else {
        const errorData = await response.json();
        showErrorAlert("Error", errorData.error || "Failed to enroll developer");
      }
    } catch (e) {
      showErrorAlert("Error", "Error enrolling developer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (dev: any) => {
    setSelectedDev(dev);
    setSelectedSkills(dev.developer_skills || []);
    setEditModalOpen(true);
  };

  const handleViewClick = (record: any) => {
    setSelectedRecord(record);
    setViewModalOpen(true);
  };

  const updateDevSkills = async () => {
    if (selectedSkills.length === 0) {
      showErrorAlert("Validation Error", "At least one skill is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/developers/${selectedDev.id}/`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          developer_skills: selectedSkills
        })
      });
      
      if (response.ok) {
        setEditModalOpen(false);
        fetchActiveDevs(activePage);
        showSuccessAlert("Success", "Skills updated successfully.");
      } else {
        showErrorAlert("Error", "Failed to update skills");
      }
    } catch (e) {
      showErrorAlert("Error", "Error updating skills");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeDev = async (id: number) => {
    const result = await showConfirmAlert(
      "Remove Developer",
      "Are you sure you want to remove this developer access?",
      "Yes, remove"
    );
    if (!result.isConfirmed) return;

    try {
      await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/developers/${id}/`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
      });
      fetchActiveDevs(activePage);
    } catch(e) {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Enroll Developer</h1>
          <p className="text-muted-foreground mt-1">Manage platform developers and assign technical skills.</p>
        </div>
      </div>

      <div className="flex space-x-1 p-1 bg-muted/50 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "pending" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          Pending NDAs
        </button>
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          Active Developers
        </button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Name & Email</th>
                  <th className="px-6 py-4 font-medium">{activeTab === 'pending' ? 'Role' : 'Skills / Tech Stack'}</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">Fetching records...</td>
                  </tr>
                ) : activeTab === 'pending' ? (
                  pendingNDAs.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">No pending NDA submissions.</td></tr>
                  ) : (
                    pendingNDAs.map((nda) => (
                      <tr key={nda.id} className="hover:bg-muted/30">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">{nda.full_name}</div>
                          <div className="text-xs text-muted-foreground">{nda.personal_email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs">{nda.role} - {nda.designation}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewClick(nda)}>
                              <Eye className="w-4 h-4 mr-2" /> View
                            </Button>
                            <Button onClick={() => handleEnrollClick(nda)} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                              <UserPlus className="w-4 h-4 mr-2"/> Enroll
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  activeDevs.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">No active developers found.</td></tr>
                  ) : (
                    activeDevs.map((dev) => (
                      <tr key={dev.id} className="hover:bg-muted/30">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">{dev.first_name} {dev.last_name}</div>
                          <div className="text-xs text-muted-foreground">{dev.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {dev.developer_skills?.map((s: string) => (
                              <span key={s} className="px-2 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 text-xs rounded-md">
                                {TECH_STACKS.find(ts => ts.id === s)?.label || s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewClick(dev)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEditClick(dev)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeDev(dev.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
            <div className="text-sm text-muted-foreground">
              Page {activeTab === "pending" ? pendingPage : activePage} of {activeTab === "pending" ? pendingTotalPages : activeTotalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => activeTab === "pending" ? setPendingPage(p => Math.max(1, p - 1)) : setActivePage(p => Math.max(1, p - 1))}
                disabled={activeTab === "pending" ? pendingPage === 1 : activePage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => activeTab === "pending" ? setPendingPage(p => Math.min(pendingTotalPages, p + 1)) : setActivePage(p => Math.min(activeTotalPages, p + 1))}
                disabled={activeTab === "pending" ? pendingPage === pendingTotalPages : activePage === activeTotalPages}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enroll Modal */}
      <Dialog open={enrollModalOpen} onOpenChange={setEnrollModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enroll Developer</DialogTitle>
            <DialogDescription>
              Enrolling {selectedNDA?.full_name} ({selectedNDA?.personal_email}). Provide a temporary password and assign skills.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <Input 
                type="text" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ex: Dev@2024!"
              />
            </div>
            <div className="space-y-3">
              <Label>Tech Stack / Skills</Label>
              <div className="grid grid-cols-2 gap-2">
                {TECH_STACKS.map(skill => (
                  <div key={skill.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`skill-${skill.id}`} 
                      checked={selectedSkills.includes(skill.id)}
                      onCheckedChange={() => handleSkillToggle(skill.id)}
                    />
                    <label htmlFor={`skill-${skill.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {skill.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollModalOpen(false)}>Cancel</Button>
            <Button onClick={submitEnrollment} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
              {isSubmitting ? "Enrolling..." : "Complete Enrollment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Tech Stack</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-3">
              <Label>Assign Skills</Label>
              <div className="grid grid-cols-2 gap-2">
                {TECH_STACKS.map(skill => (
                  <div key={skill.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`edit-skill-${skill.id}`} 
                      checked={selectedSkills.includes(skill.id)}
                      onCheckedChange={() => handleSkillToggle(skill.id)}
                    />
                    <label htmlFor={`edit-skill-${skill.id}`} className="text-sm font-medium leading-none">
                      {skill.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={updateDevSkills} disabled={isSubmitting} className="bg-indigo-600">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-background">
          <div className="bg-indigo-600/10 dark:bg-indigo-500/10 px-6 py-8 flex flex-col items-center border-b border-indigo-100 dark:border-indigo-900/50 relative">
            <div className="absolute top-4 right-4">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedRecord?.role ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                {selectedRecord?.role || 'Pending'}
              </span>
            </div>
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-4 shadow-sm">
              <UserIcon className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center">
              {selectedRecord?.full_name || `${selectedRecord?.first_name} ${selectedRecord?.last_name}`}
            </DialogTitle>
            <p className="text-muted-foreground mt-1 text-center">
              {selectedRecord?.designation || 'Developer'} {selectedRecord?.department ? `• ${selectedRecord.department}` : ''}
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contact Info Card */}
              <div className="bg-muted/30 p-4 rounded-xl space-y-3 border border-border/50">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contact Details</h4>
                <div className="flex items-center text-sm">
                  <Mail className="w-4 h-4 mr-3 text-muted-foreground" />
                  <span>{selectedRecord?.personal_email || selectedRecord?.email}</span>
                </div>
                {selectedRecord?.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="w-4 h-4 mr-3 text-muted-foreground" />
                    <span>{selectedRecord.phone}</span>
                  </div>
                )}
                {selectedRecord?.address && (
                  <div className="flex items-start text-sm">
                    <MapPin className="w-4 h-4 mr-3 mt-0.5 text-muted-foreground shrink-0" />
                    <span>{selectedRecord.address}</span>
                  </div>
                )}
              </div>

              {/* Professional Info Card */}
              <div className="bg-muted/30 p-4 rounded-xl space-y-3 border border-border/50">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Professional Info</h4>
                {selectedRecord?.employee_intern_id && (
                  <div className="flex items-center text-sm">
                    <Building className="w-4 h-4 mr-3 text-muted-foreground" />
                    <span>ID: {selectedRecord.employee_intern_id}</span>
                  </div>
                )}
                {selectedRecord?.date_of_joining && (
                  <div className="flex items-center text-sm">
                    <Calendar className="w-4 h-4 mr-3 text-muted-foreground" />
                    <span>Joined: {selectedRecord.date_of_joining}</span>
                  </div>
                )}
                {selectedRecord?.emergency_contact && (
                  <div className="flex items-start text-sm pt-2 border-t border-border/50 mt-2">
                    <span className="text-xs text-muted-foreground mr-2 font-medium">Emergency:</span>
                    <span>{selectedRecord.emergency_contact}</span>
                  </div>
                )}
              </div>
            </div>

            {selectedRecord?.developer_skills && selectedRecord.developer_skills.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned Tech Stack</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedRecord.developer_skills.map((s: string) => (
                    <span key={s} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 text-sm font-medium rounded-lg border border-indigo-100 dark:border-indigo-500/30">
                      {TECH_STACKS.find(ts => ts.id === s)?.label || s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="px-6 py-4 bg-muted/30 border-t border-border/50 flex justify-end">
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>Close Window</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default EnrollDeveloper;
