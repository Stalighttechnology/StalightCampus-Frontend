import React, { useState, useRef, useEffect } from 'react';
import { CloudUpload, Trash2, Loader2, BookOpen, User, Bot, Download, AlertTriangle } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import { Button } from '../ui/button';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { API_ENDPOINT } from '../../utils/config';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useTheme } from '@/context/ThemeContext';

type Message = { role: 'user' | 'bot'; text: string };

interface ChatProps {
  role?: string;
}

const ChatWithPDF: React.FC<ChatProps> = ({ role }) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const { theme } = useTheme();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Check if user is student and has required plan
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    const orgPlan = (user?.org_plan || "basic").toLowerCase();

    if (role && role !== 'student') {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'This feature is only available for students.',
      });
    } else if (orgPlan !== 'advance') {
      toast({
        variant: 'destructive',
        title: 'Plan Upgrade Required',
        description: 'AI Study Mode is only available on the Advance plan.',
      });
    }
  }, [role, toast]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Role and Plan Check
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const orgPlan = (user?.org_plan || "basic").toLowerCase();

  if (role && (role !== 'student' || orgPlan !== 'advance')) {
    const isPlanRestriction = role === 'student' && orgPlan !== 'advance';

    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
        <div className={`max-w-md w-full rounded-2xl shadow-xl p-8 ${theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
          <div className="text-center">
            <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              {isPlanRestriction ? 'Upgrade Required' : 'Access Denied'}
            </h2>
            <p className={`mb-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              {isPlanRestriction
                ? 'AI Study Mode is an Enterprise feature exclusive to our Advance plan.'
                : 'This feature is only available for students.'}
            </p>
            <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              {isPlanRestriction
                ? 'Please contact your institution administrator to upgrade your plan and unlock AI-powered learning tools.'
                : 'Please log in with a student account to access Study Mode.'}
            </p>
            {isPlanRestriction && (
              <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm font-medium text-primary">
                  Current Plan: <span className="uppercase font-bold">{orgPlan}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid File',
          description: 'Only PDF files are supported.',
        });
      }
    }
  };

  const handleClearFile = () => {
    setFile(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/upload-pdf/`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setChatStarted(true);
        toast({
          title: 'Success',
          description: 'PDF uploaded and ready for revision!',
        });

        // Scroll to input field after a brief delay to ensure UI is rendered
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      } else {
        // Check if response is JSON or HTML
        const contentType = response.headers.get('content-type');
        let errorData;
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload file');
        } else {
          // If response is HTML, it's likely a server error page
          const errorText = await response.text();
          console.error('Server response:', errorText);
          throw new Error('Server error: Please check if the backend is running and the endpoint is properly configured');
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      // Improved error handling
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while uploading the PDF.';
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: errorMessage,
      });
      // Log more details for debugging
      if (error instanceof Error && error.message.includes('Server error')) {
        console.log('Possible causes: Django server not restarted after URL changes, or server not running');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/ask-question/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: input }),
      });

      if (response.ok) {
        const data = await response.json();

        const formattedAnswer = `
          <div style="background-color: ${theme === 'dark' ? 'hsl(var(--card))' : '#f0f4ff'}; padding: 1rem; border-radius: 8px; border-left: 4px solid hsl(var(--primary)); font-family: sans-serif;">
            <h3 style="margin-top: 0; color: hsl(var(--primary));">📘 Quick Revision Note:</h3>
            <div style="color: ${theme === 'dark' ? 'hsl(var(--card-foreground))' : '#000'}">
              ${data.answer
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .split('. ')
            .filter(sentence => sentence)
            .join('.<br>')}.
            </div>
          </div>
        `;


        const botMessage: Message = { role: 'bot', text: formattedAnswer };
        setMessages((prev) => [...prev, botMessage]);
      }
      else {
        // Check if response is JSON or HTML
        const contentType = response.headers.get('content-type');
        let errorData;
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch response');
        } else {
          // If response is HTML, it's likely a server error page
          const errorText = await response.text();
          console.error('Server response:', errorText);
          throw new Error('Server error: Please check if the backend is running and the endpoint is properly configured');
        }
      }
    } catch (error) {
      console.error('Error fetching response:', error);
      // Improved error handling
      const errorMessageText = error instanceof Error ? error.message : "Sorry, I couldn't fetch the answer.";
      const errorMessage: Message = {
        role: 'bot',
        text: `**Error:** ${errorMessageText}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessageText,
      });
      // Log more details for debugging
      if (error instanceof Error && error.message.includes('Server error')) {
        console.log('Possible causes: Django server not restarted after URL changes, or server not running');
      }
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (chatContainerRef.current) {
      const input = chatContainerRef.current;

      // Temporarily adjust the container to show all content without scroll
      const originalHeight = input.style.height;
      const originalMaxHeight = input.style.maxHeight;
      const originalOverflow = input.style.overflow;

      input.style.height = 'auto';
      input.style.maxHeight = 'none';
      input.style.overflow = 'visible';

      html2canvas(input, {
        scale: 3, // Increase scale for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff', // Match the theme background
      }).then((canvas) => {
        // Restore original styles
        input.style.height = originalHeight;
        input.style.maxHeight = originalMaxHeight;
        input.style.overflow = originalOverflow;

        const imgData = canvas.toDataURL('image/jpeg', 1.0); // Use JPEG with max quality
        const pdf = new jsPDF('p', 'mm', 'a4');

        const imgWidth = 210; // A4 width in mm
        const pageHeight = 295; // A4 height in mm
        const margin = 10; // 10mm margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Calculate how many pages we need
        const totalPages = Math.ceil(imgHeight / (pageHeight - 2 * margin));

        // Process each page
        for (let pageNum = 0; pageNum < totalPages; pageNum++) {
          if (pageNum > 0) {
            pdf.addPage();
          }

          // Calculate the source position in the canvas
          const usablePageHeight = pageHeight - (2 * margin); // Usable height on PDF page
          const srcY = pageNum * usablePageHeight * (canvas.width / imgWidth);
          // Reduce the height slightly to avoid cutting content at the edges
          const srcHeight = Math.min(usablePageHeight * (canvas.width / imgWidth) * 0.95, canvas.height - srcY);

          // Create a temporary canvas to extract the portion we need
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');

          if (tempCtx) {
            tempCanvas.width = canvas.width;
            tempCanvas.height = srcHeight;

            // Draw the portion of the original canvas onto the temporary canvas
            tempCtx.drawImage(
              canvas,
              0, srcY, canvas.width, srcHeight,
              0, 0, canvas.width, srcHeight
            );

            // Convert the temp canvas to data URL
            const pageImgData = tempCanvas.toDataURL('image/jpeg', 1.0);

            // Calculate the destination position and dimensions in the PDF
            const destY = margin;
            const pageImgHeight = (srcHeight * imgWidth) / canvas.width;

            pdf.addImage(pageImgData, 'JPEG', 0, destY, imgWidth, pageImgHeight);
          }
        }

        pdf.save('chat-export.pdf');
      }).catch((error) => {
        // Restore original styles in case of error
        input.style.height = originalHeight;
        input.style.maxHeight = originalMaxHeight;
        input.style.overflow = originalOverflow;

        console.error('Error generating PDF:', error);
        toast({
          variant: 'destructive',
          title: 'Export Failed',
          description: 'Failed to export chat as PDF. Please try again.',
        });
      });
    }
  };

  if (!chatStarted) {
    return (
      <div className={`min-h-screen flex flex-col items-center p-2 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
        <div className={`max-w-2xl w-full rounded-xl shadow-lg p-4 ${theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
          <div className="text-center mb-4">
            <BookOpen className={`mx-auto w-10 h-10 mb-2 ${theme === 'dark' ? 'text-primary' : 'text-blue-600'}`} />
            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Study Mode</h1>
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Upload a PDF to start quick revision or reference key concepts.</p>
          </div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${dragActive
                ? theme === 'dark'
                  ? 'border-primary bg-primary/10'
                  : 'border-blue-400 bg-blue-50'
                : theme === 'dark'
                  ? 'border-border bg-card'
                  : 'border-gray-300 bg-white'
              }`}
          >
            <CloudUpload className={`mx-auto w-8 h-8 mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`} />
            <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Drag & drop your PDF here</p>
            <p className={`text-xs mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>or click to select (PDF only, max 50MB)</p>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer inline-block px-4 py-2 rounded-lg text-sm font-medium transition ${theme === 'dark'
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
            >
              Choose File
            </label>
            {file && (
              <div className={`mt-2 flex items-center justify-between rounded-md p-2 ${theme === 'dark' ? 'bg-muted' : 'bg-gray-100'
                }`}>
                <span className={`truncate max-w-[70%] text-xs ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'
                  }`}>
                  {file.name}
                </span>
                <button
                  onClick={handleClearFile}
                  className={`flex items-center gap-1 text-xs ${theme === 'dark'
                      ? 'text-destructive hover:text-destructive/80'
                      : 'text-red-600 hover:text-red-800'
                    }`}
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>
            )}
          </div>
          <Button
            onClick={handleUpload}
            disabled={!file || loading}
            className={`w-full mt-3 font-semibold py-2 rounded-md transition disabled:opacity-50 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 ${theme === 'dark' ? 'shadow-md shadow-primary/20' : 'shadow-sm'}`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start Revision'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col px-2 py-2 overflow-hidden ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <header className={`relative shadow-sm h-10 flex items-center justify-between px-2 ${theme === 'dark' ? 'bg-background text-foreground border-b border-border' : 'bg-white text-gray-900 border-b border-gray-200'}`}>
        {/* Centered Title */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
          <BookOpen className={`w-5 h-5 ${theme === 'dark' ? 'text-primary' : 'text-blue-600'}`} />
          <h1 className={`text-lg font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Study Mode</h1>
        </div>

        {/* Right Buttons */}
        <div className="flex gap-1 ml-auto">
          <Button
            onClick={exportToPDF}
            className={`font-medium flex items-center gap-1 text-xs px-1.5 py-0.5 h-7 ${theme === 'dark' ? 'text-foreground bg-muted hover:bg-accent border-border' : 'text-gray-900 bg-gray-200 hover:bg-gray-300 border-gray-300'}`}
          >
            <Download className="w-3 h-3" /> Export
          </Button>
          <Button
            onClick={() => {
              setChatStarted(false);
              setMessages([]);
              setFile(null);
            }}
            className={`font-medium text-xs px-1.5 py-0.5 h-7 ${theme === 'dark' ? 'text-foreground bg-muted hover:bg-accent border-border' : 'text-gray-900 bg-gray-200 hover:bg-gray-300 border-gray-300'}`}
          >
            New
          </Button>
        </div>
      </header>

      <div
        className={`flex-1 flex flex-col p-2 rounded-md ${theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}
      >
        <div className="max-w-5xl mx-auto w-full h-[calc(100vh-12rem)] flex flex-col">
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pt-4"
          >
            <div className="space-y-1">
              {messages.length === 0 && (
                <div className={`text-center mt-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Start your revision!</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Ask about key concepts, definitions, or specific topics from the uploaded PDF.</p>

                  <div className={`flex justify-center items-center mt-1 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'}`}>
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    <p className={`text-xs ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'}`}>
                      <strong>Warning:</strong> Your messages will be erased after you close the chat.
                    </p>
                  </div>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-start gap-1`}
                >
                  {msg.role === 'bot' && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-muted text-foreground' : 'bg-gray-200 text-gray-900'}`}>
                      <Bot className="w-3 h-3" />
                    </div>
                  )}
                  <div
                    className={`p-1.5 rounded-md max-w-[75%] text-xs shadow-sm bot-message ${msg.role === 'user' ? theme === 'dark' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-blue-600 text-white rounded-br-none' : theme === 'dark' ? 'bg-muted text-foreground border-border rounded-bl-none' : 'bg-gray-100 text-gray-900 border-gray-200 rounded-bl-none'}`}
                    dangerouslySetInnerHTML={{ __html: msg.text }}
                  />
                  {msg.role === 'user' && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-muted text-foreground' : 'bg-gray-200 text-gray-900'}`}>
                      <User className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-600'}`}>
                    <Bot className="w-3 h-3" />
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                    <Loader2 className="animate-spin h-3 w-3" />
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area - At the end of the container */}
          <div className={`p-2 rounded-md ${theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
            <div className="w-full flex gap-2">
              <input
                value={input}
                ref={inputRef}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about a concept, topic, or question..."
                className={`flex-1 px-2 py-1.5 rounded-md outline-none text-sm focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ${theme === 'dark' ? 'bg-background text-foreground border-2 border-primary/50 focus:border-primary' : 'bg-white text-gray-900 border-2 border-blue-400 focus:border-blue-600'}`}
              />
              <Button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className={`px-3 py-1.5 font-semibold rounded-md transition disabled:opacity-50 text-sm ${theme === 'dark' ? 'text-foreground bg-muted hover:bg-accent border-border' : 'text-gray-900 bg-gray-200 hover:bg-gray-300 border-gray-300'}`}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ask'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWithPDF;