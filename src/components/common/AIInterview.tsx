import React from 'react';
import { Button } from '../ui/button';
import { ExternalLink, Mic, Video, Users } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

const AIInterview: React.FC = () => {
  const { theme } = useTheme();

  const handleTakeInterview = () => {
    // Open the external interview website in a new tab
    window.open('https://www.wonsulting.com/', '_blank');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className={`max-w-2xl w-full rounded-2xl shadow-xl p-6 md:p-8 ${theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
        <div className="text-center mb-8">
          <div className="mx-auto bg-gradient-to-r from-purple-500 to-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Mic className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            AI Interview Preparation
          </h1>
          <p className={`text-base ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
            Practice your interview skills with our AI-powered platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}`}>
            <Video className={`mx-auto w-8 h-8 mb-2 ${theme === 'dark' ? 'text-primary' : 'text-blue-600'}`} />
            <h3 className={`text-center font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Video Interviews</h3>
            <p className={`text-xs text-center mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Practice with realistic video interviews
            </p>
          </div>
          
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}`}>
            <Users className={`mx-auto w-8 h-8 mb-2 ${theme === 'dark' ? 'text-primary' : 'text-blue-600'}`} />
            <h3 className={`text-center font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Real Questions</h3>
            <p className={`text-xs text-center mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Get industry-relevant questions
            </p>
          </div>
          
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}`}>
            <Mic className={`mx-auto w-8 h-8 mb-2 ${theme === 'dark' ? 'text-primary' : 'text-blue-600'}`} />
            <h3 className={`text-center font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Instant Feedback</h3>
            <p className={`text-xs text-center mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Receive immediate performance feedback
            </p>
          </div>
        </div>

        <div className={`p-4 rounded-lg mb-6 ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-200'}`}>
          <h3 className={`font-semibold mb-2 flex items-center ${theme === 'dark' ? 'text-primary' : 'text-blue-700'}`}>
            <ExternalLink className="w-4 h-4 mr-2" />
            About the AI Interview Platform
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
            Our partner platform offers advanced AI interview simulations with personalized feedback. 
            Click the button below to access the interview portal and start practicing today.
          </p>
        </div>

        <div className="flex flex-col items-center">
          <Button
            onClick={handleTakeInterview}
            className={`w-full max-w-xs font-bold py-3 px-6 rounded-lg text-lg transition-all duration-200 flex items-center justify-center gap-2 ${
              theme === 'dark' 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white'
                : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white'
            }`}
          >
            Take AI Interview <ExternalLink className="w-4 h-4" />
          </Button>
          
          <p className={`text-xs mt-3 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
            You will be redirected to our partner interview platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIInterview;