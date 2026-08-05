import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/context/ThemeContext";
import { MessageCircle, Phone, Mail } from "lucide-react";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { useToast } from "@/components/ui/use-toast";

interface ProctorStudentParentModalProps {
  student: any | null;
  onClose: () => void;
}

const ProctorStudentParentModal: React.FC<ProctorStudentParentModalProps> = ({ student, onClose }) => {
  const { theme } = useTheme();
  const { toast } = useToast();
  
  const [linkedParents, setLinkedParents] = useState<any[]>([]);
  const [parentData, setParentData] = useState({ parent_name: '', parent_email: '', parent_phone: '', parent_type: '', old_email: '' });
  const [linkingParent, setLinkingParent] = useState(false);
  const [isEditingParent, setIsEditingParent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (student) {
      fetchParents();
    }
  }, [student?.id]);

  const fetchParents = async () => {
    setLoading(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/proctor-students/${student.id}/parents/`);
      const res = await response.json();
      if (res.success) {
        setLinkedParents(res.parents);
      }
    } catch (err) {
      console.error("Failed to fetch parents", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkParent = async () => {
    if (!parentData.parent_email.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast({ title: 'Invalid Email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }
    
    setLinkingParent(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/link-parent/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parentData, student_id: student.id })
      });
      const res = await response.json();
      if (res.success) {
        toast({ title: 'Success', description: isEditingParent ? 'Parent details updated successfully!' : 'Parent account linked successfully!' });
        setParentData({ parent_name: "", parent_email: "", parent_phone: "", parent_type: "", old_email: "" });
        setIsEditingParent(false);
        if (res.parents) {
          setLinkedParents(res.parents);
        }
      } else {
        toast({ title: 'Error', description: res.message || 'Failed to link parent account', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'An error occurred while linking parent.', variant: 'destructive' });
    } finally {
      setLinkingParent(false);
    }
  };

  return (
    <Dialog open={!!student} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`sm:max-w-[600px] w-[90vw] h-[80vh] sm:h-auto rounded-xl p-4 sm:p-6 overflow-y-auto ${theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white'}`}>
        <DialogHeader>
          <DialogTitle className="pr-8 text-base sm:text-lg leading-tight">Parent Access: {student?.name} <span className="block sm:inline text-sm sm:text-base font-normal text-muted-foreground">({student?.usn})</span></DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6 mt-2 sm:mt-4">
            {linkedParents.length > 0 && (
              <div className={`p-3 sm:p-4 border rounded-lg ${theme === 'dark' ? 'bg-background border-input' : 'bg-white border-gray-200'}`}>
                <h4 className="text-sm font-medium mb-3">Linked Parents</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {linkedParents.map((parent: any, idx: number) => (
                    <div key={idx} className={`p-3 border rounded-md flex items-center justify-between ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{parent.name}</p>
                          {parent.relation && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 border border-blue-200">
                              {parent.relation}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs break-all pr-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{parent.email}</p>
                        
                        <div className="flex items-center gap-3 mt-2">
                          {parent.phone && (
                            <>
                              <a 
                                href={`https://wa.me/${parent.phone.replace(/[^0-9]/g, '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-700 transition-colors"
                                title="Chat on WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                              <a 
                                href={`tel:${parent.phone.replace(/[^0-9+]/g, '')}`} 
                                className="text-blue-500 hover:text-blue-600 transition-colors"
                                title="Call Parent"
                              >
                                <Phone className="w-4 h-4" />
                              </a>
                            </>
                          )}
                          {parent.email && (
                            <a 
                              href={`mailto:${parent.email}`} 
                              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                              title="Email Parent"
                            >
                              <Mail className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <button 
                          onClick={() => {
                            setParentData({ parent_name: parent.name, parent_email: parent.email, parent_phone: parent.phone || '', parent_type: parent.relation || '', old_email: parent.email });
                            setIsEditingParent(true);
                          }}
                          className={`p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                          title="Edit Parent"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <div className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Linked
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!linkedParents || linkedParents.length < 2 || isEditingParent) && (
              <div className={`p-3 sm:p-4 border rounded-lg space-y-3 sm:space-y-4 ${theme === 'dark' ? 'bg-background border-input' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">{isEditingParent ? 'Edit Parent Details' : 'Link New Parent'}</h4>
                  {isEditingParent && (
                    <button 
                      onClick={() => {
                        setIsEditingParent(false);
                        setParentData({ parent_name: '', parent_email: '', parent_phone: '', parent_type: '', old_email: '' });
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Grant the parent read-only access to this student's dashboard. <br />
                  <strong>Note:</strong> The parent can login with this email ID and the student's USN as the password.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="parent_name" className="text-sm mb-1.5 block">Parent's Name</Label>
                    <Input 
                      id="parent_name" 
                      placeholder="e.g. John Doe" 
                      value={parentData.parent_name}
                      onChange={(e) => setParentData({...parentData, parent_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="parent_email" className="text-sm mb-1.5 block">Parent's Email</Label>
                    <Input 
                      id="parent_email" 
                      type="email"
                      placeholder="e.g. parent@example.com" 
                      value={parentData.parent_email}
                      onChange={(e) => setParentData({...parentData, parent_email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="parent_phone" className="text-sm mb-1.5 block">Parent's Phone Number</Label>
                    <Input 
                      id="parent_phone" 
                      type="tel" 
                      placeholder="e.g. +91 9876543210" 
                      value={parentData.parent_phone}
                      onChange={(e) => setParentData({...parentData, parent_phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="parent_type" className="text-sm mb-1.5 block">Relation</Label>
                    <select
                      id="parent_type"
                      value={parentData.parent_type}
                      onChange={(e) => setParentData({...parentData, parent_type: e.target.value})}
                      className="w-full h-11 px-3 py-2 text-sm rounded-md border bg-transparent border-input focus:outline-none focus:ring-2 focus:ring-ring focus:border-input"
                    >
                      <option value="">Select Relation</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <Button 
                    disabled={!parentData.parent_name || !parentData.parent_email || linkingParent}
                    onClick={handleLinkParent}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    {linkingParent ? 'Saving...' : (isEditingParent ? 'Save Changes' : 'Enable Parent Access')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProctorStudentParentModal;
