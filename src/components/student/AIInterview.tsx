import React from 'react';
import { Button } from '../ui/button';
import { ExternalLink, Mic, Video, Users } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

const AIInterview: React.FC = () => {
  const { theme } = useTheme();

  const handleTakeInterview = () => {
    // Open the external interview website in a new tab
    // Use current origin or configured partner URL to avoid hardcoded localhost
    const partnerUrl = (window as any).__AI_PARTNER_URL || window.location.origin;
    window.open(partnerUrl, '_blank');
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`max-w-4xl w-full rounded-[2.5rem] shadow-2xl overflow-hidden border ${theme === 'dark' ? 'bg-[#1c1c1e]/60 backdrop-blur-xl border-white/10' : 'bg-white border-gray-100'}`}>
        <div className="flex flex-col md:flex-row">
          {/* Visual Side */}
          <div className={`md:w-2/5 p-12 flex items-center justify-center bg-gradient-to-br ${theme === 'dark' ? 'from-purple-900/40 to-indigo-900/40' : 'from-indigo-400 to-purple-500'}`}>
            <div className="p-10 rounded-full bg-white/20 backdrop-blur-md shadow-2xl border border-white/30 group hover:scale-110 transition-transform duration-500">
              <Mic className="h-24 w-24 text-white drop-shadow-2xl" />
            </div>
          </div>
          
          {/* Content Side */}
          <div className="md:w-3/5 p-8 md:p-14 space-y-8 flex flex-col justify-center">
            <div className="space-y-4">
              <h1 className={`text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                AI Interview <br/>
                <span className="text-primary">Preparation</span>
              </h1>
              <p className={`text-lg leading-relaxed ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Master your next industry interview with our cutting-edge AI simulation. Get real-time feedback and detailed performance analytics.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
              {[
                { icon: Video, title: 'Coding', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { icon: Users, title: 'Industry', color: 'text-purple-500', bg: 'bg-purple-500/10' },
                { icon: Mic, title: 'Feedback', color: 'text-indigo-500', bg: 'bg-indigo-500/10' }
              ].map((item, i) => (
                <div key={i} className={`p-4 rounded-2xl border flex flex-col items-center text-center space-y-2 ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  <div className={`p-2.5 rounded-xl ${item.bg} ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider">{item.title}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
              <Button
                onClick={handleTakeInterview}
                className={`w-full sm:w-auto font-bold py-7 px-10 rounded-2xl text-lg shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 bg-primary text-white hover:bg-primary/90`}
              >
                Launch Portal <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
              <div className="flex flex-col text-center sm:text-left">
                <p className={`text-[10px] font-bold uppercase tracking-widest text-muted-foreground`}>Partner Platform</p>
                <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  Securely redirects to portal
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInterview;