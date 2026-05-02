import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { useToast } from "../ui/use-toast";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { SkeletonTable } from "../ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "../ui/dialog";
import { getSemesters, manageSemesters, manageSections, manageProfile, getSemesterBootstrap } from "../../utils/hod_api";
import { useHODBootstrap } from "../../context/HODBootstrapContext";
import { useTheme } from "../../context/ThemeContext";

interface Semester {
  id: string;
  number: number;
}

interface Section {
  id: string;
  name: string;
  semester_id: string;
}

interface FormState {
  number: string;
}

interface SectionFormState {
  name: string;
}

const SemesterManagement = () => {
  const { toast } = useToast();
  const { theme } = useTheme();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isDeleteSectionModalOpen, setIsDeleteSectionModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [deletingSemester, setDeletingSemester] = useState<Semester | null>(null);
  const [managingSemester, setManagingSemester] = useState<Semester | null>(null);
  const [deletingSection, setDeletingSection] = useState<Section | null>(null);
  const [form, setForm] = useState<FormState>({ number: "" });
  const [sectionForm, setSectionForm] = useState<SectionFormState>({ name: "" });
  const [branchId, setBranchId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingSectionsSemesterId, setEditingSectionsSemesterId] = useState<string | null>(null);
  const bootstrap = useHODBootstrap();

  // Derive NAME and YEAR from semester number
  const getSemesterName = (number: number) => {
    const suffixes = ["st", "nd", "rd", "th", "th", "th", "th", "th"];
    return `${number}${suffixes[number - 1]} Semester`;
  };

  const getYear = (number: number) => {
    if (number <= 2) return "Year 1";
    if (number <= 4) return "Year 2";
    if (number <= 6) return "Year 3";
    return "Year 4";
  };

  // Fetch branch_id, semesters, and sections
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Use the bootstrap endpoint for better performance - only fetch needed data
        const bootstrapResponse = await getSemesterBootstrap(['profile', 'semesters', 'sections']);
        if (bootstrapResponse.success && bootstrapResponse.data) {
          setBranchId(bootstrapResponse.data.profile.branch_id);
          setSemesters(bootstrapResponse.data.semesters.map((s: any) => ({ id: s.id.toString(), number: s.number })));
          setSections(bootstrapResponse.data.sections.map((s: any) => ({ id: s.id, name: s.name, semester_id: s.semester_id?.toString() })));
        } else {
          throw new Error(bootstrapResponse.message || "Failed to fetch data");
        }
      } catch (err: any) {
        const errorMessage = err.message || "Network error";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const openModal = (sem: Semester | null = null) => {
    if (sem) {
      setEditingSemester(sem);
      setForm({ number: sem.number.toString() });
    } else {
      setEditingSemester(null);
      setForm({ number: "" });
    }
    setIsModalOpen(true);
  };

  const openDeleteModal = (sem: Semester) => {
    setDeletingSemester(sem);
    setIsDeleteModalOpen(true);
  };

  const openSectionModal = (sem: Semester) => {
    setManagingSemester(sem);
    setSectionForm({ name: "" });
    setIsSectionModalOpen(true);
  };

  const openDeleteSectionModal = (section: Section) => {
    setDeletingSection(section);
    setIsDeleteSectionModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSemester(null);
    setForm({ number: "" });
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingSemester(null);
  };

  const closeSectionModal = () => {
    setIsSectionModalOpen(false);
    setManagingSemester(null);
    setSectionForm({ name: "" });
  };

  const closeDeleteSectionModal = () => {
    setIsDeleteSectionModalOpen(false);
    setDeletingSection(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSectionChange = (value: string) => {
    setSectionForm((prev) => ({ ...prev, name: value }));
  };

  const handleSave = async () => {
    if (!branchId) {
      toast({ variant: "destructive", title: "Error", description: "Branch ID is missing" });
      return;
    }
    if (!form.number || isNaN(Number(form.number)) || Number(form.number) < 1 || Number(form.number) > 8) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a valid semester number (1-8)" });
      return;
    }

    setLoading(true);
    try {
      const data: any = {
        action: editingSemester ? "update" : "create",
        number: Number(form.number),
        branch_id: branchId,
      };
      if (editingSemester) {
        data.semester_id = editingSemester.id;
      }
      const response = await manageSemesters(data);
      if (response.success) {
        // Prefer server-returned semesters to avoid extra fetch
        const returnedSemesters = (response as any).semesters || (response.data && (response.data.semesters as any[]));
        if (returnedSemesters && Array.isArray(returnedSemesters)) {
          setSemesters(returnedSemesters.map((s: any) => ({ id: s.id.toString(), number: s.number })));
        }
        toast({
          title: editingSemester ? "Updated" : "Created",
          description: `Semester ${editingSemester ? "updated" : "created"} successfully!`,
        });
        closeModal();
      } else {
        throw new Error(response.message || "Failed to save semester");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Network error";
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSemester || !branchId) return;
    setLoading(true);
    try {
      const data: any = {
        action: "delete",
        semester_id: deletingSemester.id,
        branch_id: branchId,
      };
      const response = await manageSemesters(data);
      if (response.success) {
        // Prefer server-returned semesters and sections to avoid extra fetch
        const returnedSemesters = (response as any).semesters || (response.data && (response.data.semesters as any[]));
        const returnedSections = (response as any).sections || (response.data && (response.data.sections as any[]));
        if (returnedSemesters && Array.isArray(returnedSemesters)) {
          setSemesters(returnedSemesters.map((s: any) => ({ id: s.id.toString(), number: s.number })));
        }
        if (returnedSections && Array.isArray(returnedSections)) {
          setSections(returnedSections.map((s: any) => ({ id: s.id, name: s.name, semester_id: s.semester_id?.toString() })));
        }
        toast({ title: "Deleted", description: "Semester deleted successfully!" });
        closeDeleteModal();
      } else {
        throw new Error(response.message || "Semester deletion is not supported by the server");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Network error";
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSection = async () => {
    if (!managingSemester || !branchId) {
      toast({ variant: "destructive", title: "Error", description: "Semester or Branch ID is missing" });
      return;
    }
    if (!sectionForm.name || !["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"].includes(sectionForm.name)) {
      toast({ variant: "destructive", title: "Error", description: "Please select a valid section (A-Z)" });
      return;
    }
    if (sections.some(s => s.semester_id === managingSemester.id && s.name === sectionForm.name)) {
      toast({ variant: "destructive", title: "Error", description: `Section ${sectionForm.name} already exists for Semester ${managingSemester.number}` });
      return;
    }

    setLoading(true);
    try {
      const data: any = {
        action: "create",
        name: sectionForm.name,
        semester_id: managingSemester.id,
        branch_id: branchId,
      };
      const response = await manageSections(data, "POST");
      if (response.success) {
        // Prefer server-returned sections to avoid an extra fetch
        const returnedSections = (response as any).sections || (response.data && (response.data.sections as any));
        if (returnedSections && Array.isArray(returnedSections)) {
          setSections(returnedSections.map((s: any) => ({ id: s.id, name: s.name, semester_id: s.semester_id?.toString() })));
        }
        toast({
          title: "Added",
          description: `Section ${sectionForm.name} added successfully!`,
        });
        closeSectionModal();
      } else {
        throw new Error(response.message || "Failed to add section");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Network error";
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSection = async () => {
    if (!deletingSection || !branchId) return;
    setLoading(true);
    try {
      const data: any = {
        action: "delete",
        section_id: deletingSection.id,
        branch_id: branchId,
      };
      const response = await manageSections(data, "POST");
      if (response.success) {
        // Prefer server-returned sections to avoid an extra fetch
        const returnedSections = (response as any).sections || (response.data && (response.data as any));
        if (returnedSections && Array.isArray(returnedSections)) {
          setSections(returnedSections.map((s: any) => ({ id: s.id, name: s.name, semester_id: s.semester_id?.toString() })));
        }
        toast({ title: "Deleted", description: `Section ${deletingSection.name} deleted successfully!` });
        closeDeleteSectionModal();
      } else {
        throw new Error(response.message || "Section deletion is not supported by the server");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Network error";
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const filteredSemesters = semesters.filter((sem) =>
    `Semester ${sem.number}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`space-y-6 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Semester List</CardTitle>
            <Button
              onClick={() => openModal()}
              disabled={loading || !branchId}
              className="text-foreground bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white justify-center ml-4"
            >
              + Add Semester
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          

          {loading ? (
            <div className="py-4">
              <SkeletonTable rows={10} cols={4} />
            </div>
          ) : filteredSemesters.length === 0 ? (
            <div className={`text-center py-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No semesters found.</div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              {/* Mobile: stacked list - visible on mobile only */}
              <div className={`${theme === 'dark' ? 'space-y-3 p-3 sm:hidden' : 'space-y-3 p-3 sm:hidden'}`}>
                {filteredSemesters.map((sem) => {
                  const semesterSections = sections
                    .filter((s) => s.semester_id === sem.id)
                    .sort((a, b) => a.name.localeCompare(b.name));

                  return (
                    <article key={sem.id} className={`p-4 rounded-md ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`} aria-labelledby={`sem-${sem.id}`}>
                      <h3 id={`sem-${sem.id}`} className="text-base font-semibold">{getSemesterName(sem.number)}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{getYear(sem.number)}</p>

                      <div className="mt-3">
                        <div className="text-sm font-medium">Sections:</div>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {semesterSections.length > 0 ? (
                            semesterSections.map((section) => (
                              <li key={section.id} className={`inline-flex items-center justify-center text-sm font-medium px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-muted-foreground text-foreground' : 'bg-gray-100 text-gray-900'}`}>
                                {section.name}
                              </li>
                            ))
                          ) : (
                            <li className="text-sm text-gray-500">No sections</li>
                          )}
                        </ul>
                      </div>

                      <div className="mt-3 flex gap-2">
                          <Button onClick={() => openSectionModal(sem)} disabled={loading} className={`flex-1 text-sm ${theme === 'dark' ? 'bg-card border-border hover:bg-accent' : 'bg-white border-gray-300 hover:bg-gray-100 border bottom-1 text-black'}`}>
                            Add
                          </Button>
                        <Button onClick={() => openModal(sem)} disabled={loading} className={`flex-1 text-sm ${theme === 'dark' ? 'bg-card border-border hover:bg-accent' : 'bg-white border-gray-300 hover:bg-gray-100 border bottom-2 text-black'}`}>
                          Edit
                        </Button>
                        <Button onClick={() => openDeleteModal(sem)} disabled={loading} variant="destructive" className="flex-1 text-sm">
                          Delete
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Desktop / Tablet: keep existing table - hidden on mobile */}
              <div className="hidden sm:block">
                <table className="w-full text-sm table-fixed">
                  <thead className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-gray-100 text-gray-900 border-gray-300'}>
                    <tr className="border-b">
                      <th className="p-2 text-left" style={{width: '15%'}}>NAME</th>
                      <th className="p-2 text-left" style={{width: '15%'}}>YEAR</th>
                      <th className="p-2 text-left" style={{width: '50%'}}>SECTIONS</th>
                      <th className="p-2 text-center" style={{width: '15%'}}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSemesters.map((sem) => {
                        const semesterSections = sections
                          .filter((s) => s.semester_id === sem.id)
                          .sort((a, b) => a.name.localeCompare(b.name));

                        return (
                          <tr key={sem.id} className={`border-b text-center align-top ${theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-50'}`}>
                            {/* Semester Name */}
                            <td className={`p-2 text-left align-top ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{getSemesterName(sem.number)}</td>

                            {/* Year */}
                            <td className={`p-2 text-left align-top ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{getYear(sem.number)}</td>

                            {/* Sections */}
                            <td className="p-2 text-left align-top">
                              {semesterSections.length > 0 ? (
                                editingSectionsSemesterId === sem.id ? (
                                  <div className="grid grid-cols-8 gap-2">
                                    {semesterSections.map((section) => (
                                      <div
                                        key={section.id}
                                        className={`flex flex-col items-center gap-1 px-2 py-2 border rounded-md text-center ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}
                                      >
                                        <span className="text-sm font-medium">{section.name}</span>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => openDeleteSectionModal(section)}
                                          disabled={loading}
                                          title="Delete Section"
                                          className="mt-1"
                                        >
                                          <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <ul className="flex flex-wrap gap-2">
                                    {semesterSections.map((section) => (
                                      <li key={section.id} className={`inline-flex items-center justify-center text-sm font-medium px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-muted-foreground text-foreground' : 'bg-gray-100 text-gray-900'}`}>
                                        {section.name}
                                      </li>
                                    ))}
                                  </ul>
                                )
                              ) : (
                                <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>None</span>
                              )}
                            </td>

                            {/* Semester Actions */}
                            <td className="p-2 flex justify-center gap-2 items-center">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setEditingSectionsSemesterId(editingSectionsSemesterId === sem.id ? null : sem.id)}
                                disabled={loading}
                                title={editingSectionsSemesterId === sem.id ? "Close Sections Edit" : "Edit Sections"}
                              >
                                {editingSectionsSemesterId === sem.id ? (
                                  <X className="h-4 w-4" />
                                ) : (
                                  <Pencil className="h-4 w-4" />
                                )}
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openSectionModal(sem)}
                                disabled={loading}
                                title="Add Section"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openDeleteModal(sem)}
                                disabled={loading}
                                title="Delete Semester"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Semester Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'} w-full max-w-xs sm:max-w-lg rounded-md sm:rounded-lg mx-4`}> 
          <DialogHeader>
        <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
          {editingSemester ? "Edit Semester" : "Add Semester"}
        </h2>
          </DialogHeader>
          <div className="space-y-4">
        <div>
          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Semester Number</label>
          <Input
            type="number"
            name="number"
            value={form.number}
            onChange={handleChange}
            placeholder="Enter semester number (1-8)"
            min="1"
            max="8"
            disabled={loading}
            className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}
          />
        </div>
          </div>
          <DialogFooter className="mt-4 flex flex-col sm:flex-row sm:justify-end gap-2">
          <Button
            onClick={closeModal}
            disabled={loading}
            className={`w-full sm:w-auto ${theme === 'dark' ? 'bg-card border-border hover:bg-accent text-foreground' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-200'}`}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90">
            {editingSemester ? "Save Changes" : "Add Semester"}
          </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Section Modal */}
      <Dialog open={isSectionModalOpen} onOpenChange={setIsSectionModalOpen}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'} w-full max-w-xs sm:max-w-lg rounded-md sm:rounded-lg mx-4`}> 
          <DialogHeader>
        <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
          Add Section for Semester {managingSemester?.number}
        </h2>
          </DialogHeader>
          <div className="space-y-4">
        <div>
          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Section Name</label>
          <Select
            value={sectionForm.name}
            onValueChange={handleSectionChange}
            disabled={loading}
          >
            <SelectTrigger className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
          <SelectValue placeholder="Select Section" />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
          {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"].map((section) => (
            <SelectItem key={section} value={section} className={theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}>
              Section {section}
            </SelectItem>
          ))}
            </SelectContent>
          </Select>
        </div>
          </div>
          <DialogFooter className="mt-4 flex flex-col sm:flex-row sm:justify-end gap-2">
        <Button onClick={closeSectionModal} disabled={loading} className={`w-full sm:w-auto ${theme === 'dark' ? 'bg-card border-border hover:bg-accent text-foreground' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-200'}`}>
          Cancel
        </Button>
        <Button onClick={handleSaveSection} disabled={loading} className="w-full sm:w-auto bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90">
          Add Section
        </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Semester Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'} w-full max-w-xs sm:max-w-lg rounded-md sm:rounded-lg mx-4`}> 
          <DialogHeader>
        <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Delete Semester?</h2>
        <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
          Are you sure you want to delete {getSemesterName(deletingSemester?.number || 0)}?
        </p>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col sm:flex-row sm:justify-end gap-2">
        <Button onClick={closeDeleteModal} disabled={loading} className={`w-full sm:w-auto ${theme === 'dark' ? 'bg-card border-border hover:bg-accent text-foreground' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-200'}`}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleDelete} disabled={loading} className="w-full sm:w-auto">
          Delete
        </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Section Confirmation Modal */}
      <Dialog open={isDeleteSectionModalOpen} onOpenChange={setIsDeleteSectionModalOpen}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'} w-full max-w-xs sm:max-w-lg rounded-md sm:rounded-lg mx-4`}> 
          <DialogHeader>
        <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Delete Section?</h2>
        <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
          Are you sure you want to delete Section {deletingSection?.name} from Semester {semesters.find(s => s.id === deletingSection?.semester_id)?.number}?
        </p>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col sm:flex-row sm:justify-end gap-2">
        <Button onClick={closeDeleteSectionModal} disabled={loading} className={`w-full sm:w-auto ${theme === 'dark' ? 'bg-card border-border hover:bg-accent text-foreground' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-200'}`}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleDeleteSection} disabled={loading} className="w-full sm:w-auto">
          Delete
        </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SemesterManagement;