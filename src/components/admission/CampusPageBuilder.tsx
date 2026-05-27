import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, GripVertical, Trash2, Save, MoveUp, MoveDown, Copy, Check } from 'lucide-react';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
interface Block {
  id: string;
  type: 'hero' | 'about' | 'courses' | 'testimonials' | 'gallery';
  data: any;
}

const CampusPageBuilder: React.FC = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [admissionOpen, setAdmissionOpen] = useState(true);
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
        if (data.org_id) {
          setOrgId(data.org_id);
        }
        if (data.org_name) {
          setOrgName(data.org_name);
        }
        if (data.admission_page_content) {
          setBlocks(data.admission_page_content.blocks || []);
        }
        if (data.admission_settings) {
          setAdmissionOpen(data.admission_settings.is_open ?? true);
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
        admission_settings: { is_open: admissionOpen }
      };
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/campus-page/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        alert('Campus page settings saved!');
      } else {
        alert('Failed to save settings.');
      }
    } catch (err) {
      console.error("Error saving campus page data", err);
      alert('Failed to save settings.');
    }
  };

  const addBlock = (type: Block['type']) => {
    const newBlock: Block = { id: Date.now().toString(), type, data: {} };
    if (type === 'hero') {
      newBlock.data = { title: 'Welcome to Campus', subtitle: 'A great place to learn', bannerUrl: '' };
    } else if (type === 'about') {
      newBlock.data = { text: 'About our organization...', image: '' };
    } else if (type === 'testimonials') {
      newBlock.data = { items: [{ name: 'John Doe', quote: 'Great college!' }] };
    } else if (type === 'gallery') {
      newBlock.data = { images: [] };
    }
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, data: any) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, data: { ...b.data, ...data } } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
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

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Campus Page Builder</h1>
        <Button onClick={handleSave} className="flex items-center gap-2">
          <Save size={16} /> Save Changes
        </Button>
      </div>

      <div className="bg-card text-card-foreground p-6 rounded-lg shadow-sm border border-border mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Admission Status</h2>
          <p className="text-sm text-muted-foreground">Toggle whether applications are currently open.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={admissionOpen} onChange={() => setAdmissionOpen(!admissionOpen)} />
          <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {orgId && (
        <div className="bg-card text-card-foreground p-6 rounded-lg shadow-sm border border-border mb-8">
          <h2 className="text-lg font-semibold mb-2">Public Admission Link</h2>
          <p className="text-sm text-muted-foreground mb-4">Share this link with prospective students so they can view the campus page and submit enquiries or applications.</p>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              readOnly 
              value={`${window.location.origin}/admissions/${encodeURIComponent(orgName || orgId)}`} 
              className="w-full p-3 bg-muted/50 border border-input rounded font-mono text-sm"
            />
            <Button 
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/admissions/${encodeURIComponent(orgName || orgId)}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-2"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {blocks.map((block, index) => (
          <Card key={block.id} className="relative group">
            <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex flex-col gap-1 transition-opacity">
              <button onClick={() => moveBlock(index, 'up')} className="p-1 bg-muted rounded hover:bg-muted/80"><MoveUp size={14} /></button>
              <button onClick={() => moveBlock(index, 'down')} className="p-1 bg-muted rounded hover:bg-muted/80"><MoveDown size={14} /></button>
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <GripVertical size={16} className="cursor-grab" /> {block.type} Block
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => removeBlock(block.id)} className="text-destructive hover:bg-destructive/10">
                <Trash2 size={16} />
              </Button>
            </CardHeader>
            <CardContent>
              {block.type === 'hero' && (
                <div className="space-y-4">
                  <input type="text" placeholder="Title" value={block.data.title || ''} onChange={e => updateBlock(block.id, { title: e.target.value })} className="w-full p-2 border border-input rounded bg-background" />
                  <textarea placeholder="Subtitle" value={block.data.subtitle || ''} onChange={e => updateBlock(block.id, { subtitle: e.target.value })} className="w-full p-2 border border-input rounded bg-background" rows={2} />
                  <input type="text" placeholder="Banner Image URL" value={block.data.bannerUrl || ''} onChange={e => updateBlock(block.id, { bannerUrl: e.target.value })} className="w-full p-2 border border-input rounded bg-background" />
                </div>
              )}
              {block.type === 'about' && (
                <div className="space-y-4">
                  <textarea placeholder="About text..." value={block.data.text || ''} onChange={e => updateBlock(block.id, { text: e.target.value })} className="w-full p-2 border border-input rounded bg-background" rows={4} />
                  <input type="text" placeholder="Image URL" value={block.data.image || ''} onChange={e => updateBlock(block.id, { image: e.target.value })} className="w-full p-2 border border-input rounded bg-background" />
                </div>
              )}
              {block.type === 'courses' && (
                <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground border border-dashed border-border">
                  This block will automatically display active courses from the backend.
                </div>
              )}
              {block.type === 'testimonials' && (
                <div className="space-y-4">
                  {(block.data.items || []).map((item: any, i: number) => (
                    <div key={i} className="flex gap-4 items-start border-l-2 border-primary pl-4">
                      <div className="flex-1 space-y-2">
                        <input type="text" placeholder="Name" value={item.name || ''} onChange={e => {
                          const newItems = [...block.data.items];
                          newItems[i].name = e.target.value;
                          updateBlock(block.id, { items: newItems });
                        }} className="w-full p-2 border border-input rounded bg-background" />
                        <textarea placeholder="Quote" value={item.quote || ''} onChange={e => {
                          const newItems = [...block.data.items];
                          newItems[i].quote = e.target.value;
                          updateBlock(block.id, { items: newItems });
                        }} className="w-full p-2 border border-input rounded bg-background" rows={2} />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => {
                        const newItems = block.data.items.filter((_: any, idx: number) => idx !== i);
                        updateBlock(block.id, { items: newItems });
                      }}><Trash2 size={16} /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => {
                    updateBlock(block.id, { items: [...(block.data.items || []), { name: '', quote: '' }] });
                  }}>Add Testimonial</Button>
                </div>
              )}
              {block.type === 'gallery' && (
                <div className="space-y-4">
                  {(block.data.images || []).map((img: string, i: number) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" placeholder="Image URL" value={img} onChange={e => {
                        const newImages = [...block.data.images];
                        newImages[i] = e.target.value;
                        updateBlock(block.id, { images: newImages });
                      }} className="w-full p-2 border border-input rounded bg-background" />
                      <Button variant="ghost" size="icon" onClick={() => {
                        const newImages = block.data.images.filter((_: any, idx: number) => idx !== i);
                        updateBlock(block.id, { images: newImages });
                      }}><Trash2 size={16} /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => {
                    updateBlock(block.id, { images: [...(block.data.images || []), ''] });
                  }}>Add Image</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-6 border-2 border-dashed border-border rounded-lg text-center">
        <h3 className="text-lg font-medium mb-4">Add a new block</h3>
        <div className="flex flex-wrap justify-center gap-4">
          {(['hero', 'about', 'courses', 'testimonials', 'gallery'] as const).map(type => (
            <Button key={type} variant="secondary" onClick={() => addBlock(type)} className="capitalize">
              <Plus size={16} className="mr-2" /> {type}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
export default CampusPageBuilder;
