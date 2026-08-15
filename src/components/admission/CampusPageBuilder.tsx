import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, GripVertical, Trash2, Save, MoveUp, MoveDown, Copy, Check, Layout, Settings, Image as ImageIcon, FormInput, Menu, Baseline, PieChart, Eye, MonitorPlay, MessageSquare, LayoutTemplate, ExternalLink, FileText, CheckCircle, Code } from 'lucide-react';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';
import CampusPageRenderer from '../public/CampusPageRenderer';

interface Block {
  id: string;
  type: 'hero' | 'about' | 'courses' | 'testimonials' | 'gallery' | 'facilities' | 'placement' | 'faq' | 'contact' | 'enquiry';
  data: any;
}

const SIDEBAR_TABS = [
  { id: 'builder', icon: <Layout size={18} />, label: 'Page Builder' },
  { id: 'theme', icon: <Baseline size={18} />, label: 'Theme Settings' },
];

const BLOCK_TYPES = ['hero', 'about', 'courses', 'facilities', 'placement', 'testimonials', 'gallery', 'faq', 'contact', 'enquiry'] as const;


const ImageUploader = ({ value, onChange, placeholder = "Upload Image" }: { value: string, onChange: (url: string) => void, placeholder?: string }) => {
  const [isUploading, setIsUploading] = React.useState(false);
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'website/images');
    
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/r2/upload/`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        onChange(data.url);
        toast.success('Image uploaded successfully');
      } else {
        toast.error(data.message || 'Upload failed');
      }
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex gap-2 items-center flex-1 w-full">
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleFileChange} 
        disabled={isUploading}
        className="text-xs w-full max-w-[200px] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
        title={placeholder}
      />
      {isUploading && <span className="text-xs text-muted-foreground animate-pulse shrink-0">Uploading...</span>}
      {value && <img src={value} alt="Preview" className="h-8 w-8 object-cover rounded shadow-sm border border-border shrink-0" />}
    </div>
  );
};

const CampusPageBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState('builder');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [admissionOpen, setAdmissionOpen] = useState(true);
  const [theme, setTheme] = useState({ preset: 'default' });
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPageData();
  }, []);

  const fetchPageData = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/campus-page/`);
      if (response.ok) {
        const data = await response.json();
        if (data.org_id) setOrgId(data.org_id);
        if (data.org_name) setOrgName(data.org_name);
        if (data.admission_page_content) setBlocks(data.admission_page_content.blocks || []);
        if (data.admission_settings) {
          setAdmissionOpen(data.admission_settings.is_open ?? true);
          if (data.admission_settings.theme) setTheme(data.admission_settings.theme);
        }
      }
    } catch (err) {
      console.error("Error fetching campus page data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        admission_page_content: { blocks },
        admission_settings: { is_open: admissionOpen, theme }
      };
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/campus-page/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        toast.success('Campus page settings saved successfully!');
      } else {
        toast.error('Failed to save settings.');
      }
    } catch (err) {
      console.error("Error saving campus page data", err);
      toast.error('Failed to save settings.');
    }
  };

  const addBlock = (type: Block['type']) => {
    const newBlock: Block = { id: Date.now().toString(), type, data: {} };
    switch (type) {
      case 'hero': newBlock.data = { title: 'Welcome to Campus', subtitle: 'A great place to learn', bannerUrl: '', ctaText: 'Apply Now', overlayOpacity: 0.6 }; break;
      case 'about': newBlock.data = { text: '<p>About our institution...</p>', image: '', stats: [] }; break;
      case 'courses': newBlock.data = { autoFetch: true, items: [] }; break;
      case 'facilities': newBlock.data = { facilities: [{ title: 'Library', desc: 'Modern digital library' }] }; break;
      case 'placement': newBlock.data = { percentage: '95%', highest: '25 LPA', average: '6.5 LPA', recruiters: [] }; break;
      case 'testimonials': newBlock.data = { items: [{ name: 'John Doe', quote: 'Great college!', courseName: 'B.Tech' }] }; break;
      case 'gallery': newBlock.data = { images: [] }; break;
      case 'faq': newBlock.data = { items: [{ question: 'Hostel available?', answer: 'Yes' }] }; break;
      case 'contact': newBlock.data = { email: 'admin@campus.edu', phone: '+1 234 567 8900', address: '123 Campus Rd' }; break;
      case 'enquiry': newBlock.data = { phone: '+1 234 567 8900', email: 'admissions@campus.edu' }; break;
    }
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, data: any) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, data: { ...b.data, ...data } } : b));
  };

  const removeBlock = (id: string) => setBlocks(blocks.filter(b => b.id !== id));
  const duplicateBlock = (block: Block) => {
    setBlocks([...blocks, { ...block, id: Date.now().toString() }]);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...blocks];
    if (direction === 'up' && index > 0) {
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    } else if (direction === 'down' && index < newBlocks.length - 1) {
      [newBlocks[index + 1], newBlocks[index]] = [newBlocks[index], newBlocks[index + 1]];
    }
    setBlocks(newBlocks);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-160px)] border rounded-xl bg-background overflow-hidden border-border">
        <div className="flex flex-col lg:flex-row items-center justify-between p-4 lg:px-6 lg:h-16 border-b border-border bg-card gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 bg-muted/5">
          {/* Settings panel skeleton */}
          <div className="w-full lg:w-96 border-r border-border bg-card p-6 space-y-6 flex-shrink-0">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
          {/* Canvas workspace skeleton */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const getThemeStyle = () => {
    const preset = theme.preset || 'default';
    switch (preset) {
      case 'ocean': return { '--primary': '221 83% 53%' } as React.CSSProperties;
      case 'emerald': return { '--primary': '142 71% 45%' } as React.CSSProperties;
      case 'rose': return { '--primary': '346 87% 43%' } as React.CSSProperties;
      case 'amber': return { '--primary': '38 92% 50%' } as React.CSSProperties;
      case 'slate': return { '--primary': '215 16% 47%' } as React.CSSProperties;
      default: return {} as React.CSSProperties;
    }
  };

  return (
    <div id="campus-builder-container" className="flex flex-col min-h-[calc(100vh-160px)] border rounded-xl bg-background overflow-hidden shadow-sm border-border" style={getThemeStyle()}>
      {/* Topbar / Navigation */}
      <header id="campus-builder-header" className="flex flex-col min-[1250px]:flex-row min-[1250px]:items-center justify-between p-4 min-[1250px]:px-6 h-auto min-[1250px]:h-16 border-b border-border bg-card gap-4 shrink-0 shadow-sm z-10">
        <div className="flex flex-col min-[1250px]:flex-row min-[1250px]:items-center gap-2.5 min-[1250px]:gap-8 w-full min-[1250px]:w-auto">
          <h1 className="font-semibold text-lg flex items-center gap-2 text-primary border-b min-[1250px]:border-b-0 min-[1250px]:border-r border-border pb-2 min-[1250px]:pb-0 pr-0 min-[1250px]:pr-6 whitespace-nowrap">
            <LayoutTemplate className="w-5 h-5" /> Campus CMS
          </h1>
          <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('builder')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'builder' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <LayoutTemplate size={14} /> Page Builder
            </button>
            <button
              onClick={() => setActiveTab('theme')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'theme' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Baseline size={14} /> Theme & Style
            </button>
            <button
              onClick={() => setActiveTab('embed')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'embed' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <ExternalLink size={14} /> Embed & Integration
            </button>
          </nav>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between min-[1250px]:justify-end gap-3 w-full min-[1250px]:w-auto pt-2 min-[1250px]:pt-0 border-t min-[1250px]:border-t-0 border-border min-[1250px]:self-center">
          <h2 className="text-xs font-semibold text-muted-foreground truncate max-w-[200px] min-[1250px]:max-w-none">Editing: {orgName || 'Campus Profile'}</h2>
          <div className="flex items-center gap-2 shrink-0">
            {orgId && (
              <Button 
                variant="outline" size="sm" 
                onClick={() => window.open(`/admissions/${encodeURIComponent(orgName || orgId)}`, '_blank')}
                className="gap-1.5 text-xs h-8 px-2.5"
              >
                <Eye size={14} /> <span>View Page</span>
              </Button>
            )}
            <Button onClick={handleSave} className="gap-1.5 text-xs h-8 px-2.5 shadow-md">
              <Save size={14} /> <span>Publish Changes</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto lg:overflow-hidden">
        {activeTab === 'builder' ? (
          <div className="flex-1 flex flex-col lg:overflow-hidden justify-center bg-muted/10">
            {/* Main Pane: Editor */}
            <div className="w-full max-w-none mx-auto flex flex-col bg-background shadow-xl border-x border-border min-h-[calc(100vh-220px)] lg:h-full lg:overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30 shrink-0 flex justify-between items-center">
                <h3 className="font-semibold flex items-center gap-2"><Layout size={18} /> Page Blocks</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Admissions:</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={admissionOpen} onChange={() => setAdmissionOpen(!admissionOpen)} />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
                {blocks.map((block, index) => (
                  <Card key={block.id} className="relative group border-muted-foreground/20 hover:border-primary/40 transition-colors shadow-sm">
                    <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <GripVertical size={16} className="text-muted-foreground" /> {block.type}
                      </CardTitle>
                      <div className="flex items-center gap-1 bg-muted/30 rounded-md p-1 border border-border/50">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => moveBlock(index, 'up')} title="Move Up" disabled={index === 0}>
                          <MoveUp size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => moveBlock(index, 'down')} title="Move Down" disabled={index === blocks.length - 1}>
                          <MoveDown size={14} />
                        </Button>
                        <div className="w-[1px] h-4 bg-border mx-1"></div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => duplicateBlock(block)} title="Duplicate">
                          <Copy size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeBlock(block.id)} title="Delete">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      {block.type === 'hero' && (
                        <div className="space-y-3">
                          <input type="text" placeholder="Main Title" value={block.data.title || ''} onChange={e => updateBlock(block.id, { title: e.target.value })} className="w-full p-2 border border-input rounded text-sm bg-background" />
                          <textarea placeholder="Subtitle description" value={block.data.subtitle || ''} onChange={e => updateBlock(block.id, { subtitle: e.target.value })} className="w-full p-2 border border-input rounded text-sm bg-background" rows={2} />
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" placeholder="CTA Button Text" value={block.data.ctaText || ''} onChange={e => updateBlock(block.id, { ctaText: e.target.value })} className="w-full p-2 border border-input rounded text-sm bg-background" />
                            <input type="text" placeholder="CTA Link (Optional)" value={block.data.ctaLink || ''} onChange={e => updateBlock(block.id, { ctaLink: e.target.value })} className="w-full p-2 border border-input rounded text-sm bg-background" />
                          </div>
                          <div className="flex flex-col gap-2 border-t border-border pt-3 mt-2">
                            <label className="text-xs font-semibold">Hero Media</label>
                            <div className="flex gap-2 items-center">
                              <MonitorPlay className="w-4 h-4 text-muted-foreground shrink-0" />
                              <input type="text" placeholder="Background Video URL (.mp4, .webm) OR use Image Upload below" value={block.data.backgroundVideoUrl || ''} onChange={e => {
                                updateBlock(block.id, { backgroundVideoUrl: e.target.value });
                              }} className="flex-1 p-2 border border-input rounded text-sm bg-background" />
                            </div>
                            <div className="flex gap-2 items-center">
                              <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                              <ImageUploader value={block.data.bannerUrl || ''} onChange={url => updateBlock(block.id, { bannerUrl: url })} placeholder="Upload Hero Image" />
                            </div>
                          </div>
                        </div>
                      )}
                      {block.type === 'about' && (
                        <div className="space-y-3">
                          <label className="text-xs font-semibold">Rich Text Content (HTML supported)</label>
                          <textarea placeholder="<p>About our institution...</p>" value={block.data.text || ''} onChange={e => updateBlock(block.id, { text: e.target.value })} className="w-full p-2 border border-input rounded text-sm font-mono bg-muted/30" rows={4} />
                          <div className="flex gap-2 items-center border-t border-border pt-3">
                            <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                            <ImageUploader value={block.data.image || ''} onChange={url => updateBlock(block.id, { image: url })} placeholder="Upload About Image" />
                          </div>
                          <div className="pt-2 border-t border-border">
                            <label className="text-xs font-semibold mb-2 block">Statistics Cards</label>
                            {(block.data.stats || []).map((stat: any, i: number) => (
                              <div key={i} className="flex gap-2 mb-2">
                                <input type="text" placeholder="Value (e.g. 25+)" value={stat.value} onChange={e => {
                                  const n = [...block.data.stats]; n[i].value = e.target.value; updateBlock(block.id, {stats: n});
                                }} className="w-1/3 p-1.5 text-sm border border-input bg-background text-foreground rounded" />
                                <input type="text" placeholder="Label (e.g. Years)" value={stat.label} onChange={e => {
                                  const n = [...block.data.stats]; n[i].label = e.target.value; updateBlock(block.id, {stats: n});
                                }} className="flex-1 p-1.5 text-sm border border-input bg-background text-foreground rounded" />
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                  const n = block.data.stats.filter((_:any, idx:number) => idx !== i); updateBlock(block.id, {stats: n});
                                }}><Trash2 size={14}/></Button>
                              </div>
                            ))}
                            <Button variant="secondary" size="sm" onClick={() => updateBlock(block.id, {stats: [...(block.data.stats||[]), {value:'', label:''}]})} className="text-xs">Add Stat</Button>
                          </div>
                        </div>
                      )}
                      {block.type === 'courses' && (
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 text-sm">
                          <p className="font-semibold text-primary mb-2">Dynamic Courses Integration</p>
                          <p className="text-muted-foreground mb-4">This block automatically fetches active courses from the Stalight Campus backend.</p>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={block.data.autoFetch !== false} onChange={e => updateBlock(block.id, {autoFetch: e.target.checked})} />
                            Auto-sync with backend courses
                          </label>
                        </div>
                      )}
                      {block.type === 'facilities' && (
                        <div className="space-y-3">
                           {(block.data.facilities || []).map((fac: any, i: number) => (
                            <div key={i} className="p-3 border rounded bg-muted/20 space-y-2 relative">
                              <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-destructive" onClick={() => {
                                const n = block.data.facilities.filter((_:any, idx:number) => idx !== i); updateBlock(block.id, {facilities: n});
                              }}><Trash2 size={12}/></Button>
                              <input type="text" placeholder="Facility Title" value={fac.title} onChange={e => {
                                const n = [...block.data.facilities]; n[i].title = e.target.value; updateBlock(block.id, {facilities: n});
                              }} className="w-[90%] p-1.5 text-sm border border-input bg-background text-foreground rounded font-semibold" />
                              <input type="text" placeholder="Description" value={fac.desc} onChange={e => {
                                const n = [...block.data.facilities]; n[i].desc = e.target.value; updateBlock(block.id, {facilities: n});
                              }} className="w-full p-1.5 text-sm border border-input bg-background text-foreground rounded" />
                            </div>
                          ))}
                          <Button variant="secondary" size="sm" onClick={() => updateBlock(block.id, {facilities: [...(block.data.facilities||[]), {title:'', desc:''}]})} className="text-xs">Add Facility</Button>
                        </div>
                      )}
                      {block.type === 'placement' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            <div><label className="text-xs">Placement %</label><input type="text" value={block.data.percentage || ''} onChange={e=>updateBlock(block.id, {percentage: e.target.value})} className="w-full p-1.5 text-sm border border-input bg-background text-foreground rounded" /></div>
                            <div><label className="text-xs">Highest Pkg</label><input type="text" value={block.data.highest || ''} onChange={e=>updateBlock(block.id, {highest: e.target.value})} className="w-full p-1.5 text-sm border border-input bg-background text-foreground rounded" /></div>
                            <div><label className="text-xs">Avg Pkg</label><input type="text" value={block.data.average || ''} onChange={e=>updateBlock(block.id, {average: e.target.value})} className="w-full p-1.5 text-sm border border-input bg-background text-foreground rounded" /></div>
                          </div>
                          <div>
                            <label className="text-xs font-semibold">Recruiter Logos (URLs)</label>
                            {(block.data.recruiters || []).map((url: string, i: number) => (
                              <div key={i} className="flex gap-2 mt-1">
                                <ImageUploader value={url} onChange={newUrl => {
                                  const n=[...block.data.recruiters]; n[i]=newUrl; updateBlock(block.id, {recruiters: n});
                                }} placeholder="Upload Logo" />
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={()=>{
                                  const n=block.data.recruiters.filter((_:any, idx:number)=>idx!==i); updateBlock(block.id, {recruiters: n});
                                }}><Trash2 size={14}/></Button>
                              </div>
                            ))}
                            <Button variant="secondary" size="sm" className="mt-2 text-xs" onClick={()=>updateBlock(block.id, {recruiters: [...(block.data.recruiters||[]), '']})}>Add Logo</Button>
                          </div>
                        </div>
                      )}
                      {block.type === 'testimonials' && (
                        <div className="space-y-3">
                          {(block.data.items || []).map((item: any, i: number) => (
                            <div key={i} className="p-3 border rounded bg-muted/10 space-y-2 relative">
                              <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-destructive" onClick={() => {
                                const n = block.data.items.filter((_:any, idx:number) => idx !== i); updateBlock(block.id, {items: n});
                              }}><Trash2 size={12}/></Button>
                              <div className="grid grid-cols-2 gap-2 w-[90%]">
                                <input type="text" placeholder="Name" value={item.name || ''} onChange={e => {
                                  const n = [...block.data.items]; n[i].name = e.target.value; updateBlock(block.id, {items: n});
                                }} className="w-full p-1.5 text-sm border border-input bg-background text-foreground rounded" />
                                <input type="text" placeholder="Course/Alumni" value={item.courseName || ''} onChange={e => {
                                  const n = [...block.data.items]; n[i].courseName = e.target.value; updateBlock(block.id, {items: n});
                                }} className="w-full p-1.5 text-sm border border-input bg-background text-foreground rounded" />
                              </div>
                              <textarea placeholder="Quote..." value={item.quote || ''} onChange={e => {
                                const n = [...block.data.items]; n[i].quote = e.target.value; updateBlock(block.id, {items: n});
                              }} className="w-full p-1.5 text-sm border border-input bg-background text-foreground rounded" rows={2} />
                              <div className="flex items-center gap-2 mt-2 bg-background p-1.5 border border-input rounded">
                                <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                                <ImageUploader value={item.image || ''} onChange={url => {
                                  const n = [...block.data.items]; n[i].image = url; updateBlock(block.id, {items: n});
                                }} placeholder="Upload Profile Image (Optional)" />
                              </div>
                            </div>
                          ))}
                          <Button variant="secondary" size="sm" onClick={() => updateBlock(block.id, {items: [...(block.data.items||[]), {name:'', quote:''}]})} className="text-xs">Add Testimonial</Button>
                        </div>
                      )}
                      {block.type === 'gallery' && (
                        <div className="space-y-3">
                          {(block.data.images || []).map((img: string, i: number) => (
                            <div key={i} className="flex gap-2">
                              <ImageIcon className="w-4 h-4 text-muted-foreground mt-2 shrink-0" />
                              <div className="flex-1 bg-background p-1.5 border border-input rounded">
                                <ImageUploader value={img} onChange={url => {
                                  const n = [...block.data.images]; n[i] = url; updateBlock(block.id, {images: n});
                                }} placeholder="Upload Gallery Image" />
                              </div>
                              <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => {
                                const n = block.data.images.filter((_:any, idx:number) => idx !== i); updateBlock(block.id, {images: n});
                              }}><Trash2 size={14}/></Button>
                            </div>
                          ))}
                          <Button variant="secondary" size="sm" onClick={() => updateBlock(block.id, {images: [...(block.data.images||[]), '']})} className="text-xs">Add Media</Button>
                        </div>
                      )}
                      {block.type === 'faq' && (
                        <div className="space-y-3">
                          {(block.data.items || []).map((faq: any, i: number) => (
                            <div key={i} className="p-3 border rounded bg-muted/10 space-y-2 relative">
                              <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-destructive" onClick={() => {
                                const n = block.data.items.filter((_:any, idx:number) => idx !== i); updateBlock(block.id, {items: n});
                              }}><Trash2 size={12}/></Button>
                              <input type="text" placeholder="Question" value={faq.question || ''} onChange={e => {
                                const n = [...block.data.items]; n[i].question = e.target.value; updateBlock(block.id, {items: n});
                              }} className="w-[90%] p-1.5 text-sm border border-input bg-background text-foreground rounded font-semibold" />
                              <textarea placeholder="Answer" value={faq.answer || ''} onChange={e => {
                                const n = [...block.data.items]; n[i].answer = e.target.value; updateBlock(block.id, {items: n});
                              }} className="w-full p-1.5 text-sm border border-input bg-background text-foreground rounded" rows={2} />
                            </div>
                          ))}
                          <Button variant="secondary" size="sm" onClick={() => updateBlock(block.id, {items: [...(block.data.items||[]), {question:'', answer:''}]})} className="text-xs">Add FAQ</Button>
                        </div>
                      )}
                      {block.type === 'contact' && (
                        <div className="space-y-3">
                          <input type="text" placeholder="Address" value={block.data.address || ''} onChange={e=>updateBlock(block.id, {address: e.target.value})} className="w-full p-1.5 text-sm border border-input bg-background text-foreground rounded" />
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" placeholder="Email" value={block.data.email || ''} onChange={e=>updateBlock(block.id, {email: e.target.value})} className="w-full p-1.5 text-sm border border-input bg-background text-foreground rounded" />
                            <input type="text" placeholder="Phone" value={block.data.phone || ''} onChange={e=>updateBlock(block.id, {phone: e.target.value})} className="w-full p-1.5 text-sm border border-input bg-background text-foreground rounded" />
                          </div>
                          <input type="text" placeholder="Google Maps Embed URL" value={block.data.googleMapsUrl || ''} onChange={e=>updateBlock(block.id, {googleMapsUrl: e.target.value})} className="w-full p-1.5 text-sm border border-input bg-background text-foreground rounded" />
                          <input type="text" placeholder="WhatsApp Chat Link (Optional)" value={block.data.whatsappLink || ''} onChange={e=>updateBlock(block.id, {whatsappLink: e.target.value})} className="w-full p-1.5 text-sm border border-input bg-background text-foreground rounded" />
                        </div>
                      )}
                      {block.type === 'enquiry' && (
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 text-sm">
                          <p className="font-semibold text-primary mb-2 flex items-center gap-2"><MessageSquare size={16}/> Admission CRM Connected</p>
                          <p className="text-muted-foreground mb-4">The Enquiry form is directly integrated with your Lead Pipeline. Leads captured here will appear on your Admission Dashboard automatically.</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div><label className="text-xs">Support Phone</label><input type="text" value={block.data.phone || ''} onChange={e=>updateBlock(block.id, {phone: e.target.value})} className="w-full p-1.5 border border-input bg-background text-foreground rounded mt-1" /></div>
                            <div><label className="text-xs">Support Email</label><input type="text" value={block.data.email || ''} onChange={e=>updateBlock(block.id, {email: e.target.value})} className="w-full p-1.5 border border-input bg-background text-foreground rounded mt-1" /></div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                <div className="mt-8 p-6 border-2 border-dashed border-border rounded-xl text-center bg-muted/10">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Add Content Block</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {BLOCK_TYPES.map(type => {
                      const isAdded = blocks.some(b => b.type === type);
                      return (
                        <Button 
                          key={type} 
                          variant="outline" 
                          size="sm" 
                          onClick={() => addBlock(type)} 
                          disabled={isAdded}
                          className={`capitalize ${isAdded ? 'opacity-50 cursor-not-allowed' : 'bg-background'}`}>
                          <Plus size={14} className="mr-1" /> {type}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="h-20"></div>
              </div>
            </div>
          </div>
        ) : activeTab === 'theme' ? (
          <div className="flex-1 flex overflow-y-auto justify-center bg-muted/10 p-8">
            <div className="w-full max-w-none bg-card rounded-2xl shadow-xl border border-border p-8 h-fit space-y-8">
              <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2"><Baseline className="text-primary" /> Theme Settings</h2>
                <p className="text-muted-foreground mt-1">Customize the look and feel of your public campus page.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Color Palette</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { id: 'default', name: 'Violet (Default)', color: 'hsl(266, 100%, 67%)' },
                    { id: 'ocean', name: 'Ocean Blue', color: 'hsl(221, 83%, 53%)' },
                    { id: 'emerald', name: 'Emerald', color: 'hsl(142, 71%, 45%)' },
                    { id: 'rose', name: 'Rose', color: 'hsl(346, 87%, 43%)' },
                    { id: 'amber', name: 'Amber', color: 'hsl(38, 92%, 50%)' },
                    { id: 'slate', name: 'Slate', color: 'hsl(215, 16%, 47%)' }
                  ].map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => setTheme({ ...theme, preset: preset.id })}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme.preset === preset.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    >
                      <div className="w-10 h-10 rounded-full shadow-sm" style={{ backgroundColor: preset.color }}></div>
                      <span className="text-sm font-medium">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'embed' ? (
          <div className="flex-1 flex overflow-y-auto justify-center bg-muted/10 p-4 sm:p-8">
            <div className="w-full max-w-none bg-card rounded-2xl shadow-xl border border-border p-6 sm:p-8 h-fit space-y-8">
              <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                  <ExternalLink className="text-primary" /> Website Integration & Embeddable Lead Form
                </h2>
                <p className="text-muted-foreground mt-1">
                  Embed your Stalight Campus enquiry form directly onto your college website so new leads automatically flow into your CRM Lead Pipeline.
                </p>

                {/* 3-Step Setup Guide */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/40 p-4 rounded-xl border border-border text-xs mt-4">
                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-xs shrink-0">1</span>
                    <div>
                      <strong className="text-foreground block font-semibold mb-0.5">Copy Embed Code</strong>
                      Click "Copy Code" on Widget A (Quick Contact) or Widget B (Application Wizard).
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-xs shrink-0">2</span>
                    <div>
                      <strong className="text-foreground block font-semibold mb-0.5">Paste on College Site</strong>
                      Paste into any website builder (WordPress, Wix, HTML, React, Webflow).
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-xs shrink-0">3</span>
                    <div>
                      <strong className="text-foreground block font-semibold mb-0.5">Automatic CRM Sync</strong>
                      Leads & documents instantly land in your Admission Manager Lead Pipeline!
                    </div>
                  </div>
                </div>
              </div>

              {/* Option 1A: Quick Contact / Enquiry Widget */}
              <div className="space-y-4 p-6 border border-primary/20 bg-primary/5 rounded-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-primary/20 pb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-primary flex items-center gap-2">
                      Widget A: Quick Contact / Enquiry Form (Contact Us Button)
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Lightweight enquiry form for sidebar or contact sections. Captures leads with dynamic course selection.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      const embedCode = `<iframe src="${window.location.origin}/admissions/${encodeURIComponent(orgName || orgId || 'campus')}?embed=true&mode=contact" width="100%" height="520" frameborder="0" style="border:0; border-radius:12px; overflow:hidden;" allowfullscreen></iframe>`;
                      navigator.clipboard.writeText(embedCode);
                      toast.success('Quick Contact form embed code copied!');
                    }}
                    className="gap-2 shrink-0 text-xs h-9"
                  >
                    <FileText size={14} />
                    Copy Contact Form Code
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Contact Embed Code</label>
                  <pre className="p-4 bg-muted/80 text-foreground font-mono text-xs rounded-lg overflow-x-auto border border-border whitespace-pre-wrap">
{`<iframe
  src="${window.location.origin}/admissions/${encodeURIComponent(orgName || orgId || 'campus')}?embed=true&mode=contact"
  width="100%"
  height="520"
  frameborder="0"
  style="border:0; border-radius:12px; overflow:hidden;"
  allowfullscreen
></iframe>`}
                  </pre>
                </div>
              </div>

              {/* Option 1B: Full Application Wizard Embed (Apply Now) */}
              <div className="space-y-4 p-6 border border-blue-500/20 bg-blue-500/5 rounded-xl dark:bg-blue-950/20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-blue-500/20 pb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-blue-600 dark:text-blue-400 flex items-center gap-2">
                      Widget B: Full Admission Application Wizard (Apply Now Button)
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Multi-step application wizard for website "Apply Now" pages. Includes live course selection, personal details, and document upload handling (10th/12th marks cards, TC, Aadhaar, photo).
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      const embedCode = `<iframe src="${window.location.origin}/admissions/${encodeURIComponent(orgName || orgId || 'campus')}?embed=true&mode=apply" width="100%" height="750" frameborder="0" style="border:0; border-radius:12px; overflow:hidden;" allowfullscreen></iframe>`;
                      navigator.clipboard.writeText(embedCode);
                      toast.success('Full Application Wizard embed code copied!');
                    }}
                    className="gap-2 shrink-0 text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <FileText size={14} />
                    Copy Application Wizard Code
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Application Wizard Embed Code</label>
                  <pre className="p-4 bg-muted/80 text-foreground font-mono text-xs rounded-lg overflow-x-auto border border-border whitespace-pre-wrap">
{`<iframe
  src="${window.location.origin}/admissions/${encodeURIComponent(orgName || orgId || 'campus')}?embed=true&mode=apply"
  width="100%"
  height="750"
  frameborder="0"
  style="border:0; border-radius:12px; overflow:hidden;"
  allowfullscreen
></iframe>`}
                  </pre>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs text-muted-foreground">
                  <div className="p-3 bg-background border border-border rounded-lg">
                    <strong className="text-foreground block mb-1">1. Live Course Catalog</strong>
                    Auto-fetches active courses and seat availability directly from your campus backend.
                  </div>
                  <div className="p-3 bg-background border border-border rounded-lg">
                    <strong className="text-foreground block mb-1">2. Secure Document Uploads</strong>
                    Students upload marks cards, identity proof, and photos directly to cloud storage.
                  </div>
                  <div className="p-3 bg-background border border-border rounded-lg">
                    <strong className="text-foreground block mb-1">3. Automated Applications</strong>
                    Submits full student profiles into your Admission Applications & Document Verification dashboard.
                  </div>
                </div>
              </div>

              {/* Option 2: Direct REST API (Upcoming) */}
              <div className="space-y-3 p-6 border border-border bg-muted/20 rounded-xl opacity-80">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                    Option 2: Custom Webhook & REST API Integration
                  </h3>
                  <span className="bg-primary/10 text-primary border border-primary/20 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Upcoming Feature
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Direct custom REST API endpoints for developer integrations, webhooks, and third-party CRM form connectors will be available in an upcoming platform release.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/20 text-muted-foreground">
            <div className="text-center">
              <Settings className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <h2 className="text-2xl font-semibold mb-2">Module Under Construction</h2>
              <p>The <strong>{SIDEBAR_TABS.find(t=>t.id===activeTab)?.label}</strong> module will be available in a future update.</p>
              <Button variant="outline" className="mt-6" onClick={() => setActiveTab('builder')}>Return to Page Builder</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default CampusPageBuilder;
