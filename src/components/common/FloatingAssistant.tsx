import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Minimize2, Maximize2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { fetchWithTokenRefresh } from '@/utils/authService';
import { API_BASE_URL } from '@/utils/config';
import { useToast } from '../ui/use-toast';

interface Attachment {
  file_id: string;
  kind: 'image' | 'pdf' | 'csv' | 'txt';
  note?: string;
}

interface ClientMetadata {
  page: string;
  route: string;
  viewport: { width: number; height: number };
  app_version: string;
}

interface UiState {
  widget_open: boolean;
  widget_variant: string;
  theme: string;
  prefers_compact: boolean;
}

interface ChatPayload {
  session_id: string;
  user_id: number;
  user_role: string;
  user_name?: string;
  ui_locale: string;
  query: string;
  client_metadata: ClientMetadata;
  ui_state: UiState;
  attachments: Attachment[];
}

interface UICard {
  type: string;
  title?: string;
  subtitle?: string;
  key_values?: Record<string, string>;
  actions?: Array<{ label?: string; [key: string]: unknown }>;
}

interface SuggestedAction {
  text: string;
}

/**
 * Generates a UUID v4 string
 * @returns A UUID v4 string
 */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  ui_cards?: UICard[];
  suggested_actions?: SuggestedAction[];
}

const FloatingAssistant: React.FC = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId] = useState(generateUUID());
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get user information from localStorage
  const getUserInfo = () => {
    const userStr = localStorage.getItem('user');
    const role = localStorage.getItem('role');
    if (userStr && role) {
      try {
        const user = JSON.parse(userStr);
        return {
          user_id: parseInt(user.user_id) || 0,
          user_role: role,
          user_name: user.username || '',
        };
      } catch (e) {
        console.error('Error parsing user info:', e);
      }
    }
    return { user_id: 0, user_role: 'student', user_name: '' };
  };

  // Load chat history from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem(`assistant_chat_${sessionId}`);
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        // Convert timestamp strings back to Date objects
        const messagesWithDates = parsedMessages.map((msg: Record<string, unknown>) => ({
          ...msg,
          timestamp: new Date(msg.timestamp as string),
        }));
        setMessages(messagesWithDates);
      } catch (e) {
        console.error('Error parsing saved messages:', e);
      }
    } else {
      // Add role-specific welcome message with user's name
      const { user_role, user_name } = getUserInfo();
      const displayName = user_name || 'there';
      let welcomeContent = "";
      let suggestedActions: SuggestedAction[] = [];
      
      switch(user_role) {
        case 'student':
          welcomeContent = `Hello ${displayName} 👋 — I can help with your timetable, attendance, and notices. Try: 'When is my next class?', 'What's my attendance percentage in DBMS?', or 'Show recent notices'.`;
          suggestedActions = [
            { text: "Next class" },
            { text: "My attendance" },
            { text: "Recent notices" }
          ];
          break;
        case 'faculty':
          welcomeContent = `Hello ${displayName} 👋 — I can help with your classes, attendance records, and student queries. Try: 'Show my timetable', 'Mark attendance for section A', or 'View pending student queries'.`;
          suggestedActions = [
            { text: "My timetable" },
            { text: "Mark attendance" },
            { text: "Student queries" }
          ];
          break;
        case 'hod':
          welcomeContent = `Hello ${displayName} 👋 — I can help with department overview, faculty management, and academic reports. Try: 'Show department summary', 'Faculty attendance report', or 'Pending leave requests'.`;
          suggestedActions = [
            { text: "Department summary" },
            { text: "Faculty report" },
            { text: "Leave requests" }
          ];
          break;
        case 'admin':
        case 'principal':
          welcomeContent = `Hello ${displayName} 👋 — I can help with system management, user accounts, and overall analytics. Try: 'System status', 'User management', or 'Generate analytics report'.`;
          suggestedActions = [
            { text: "System status" },
            { text: "User management" },
            { text: "Analytics report" }
          ];
          break;
        case 'fees':
          welcomeContent = `Hello ${displayName} 👋 — I can help with fee management, payment tracking, and financial reports. Try: 'Show pending fees', 'Payment status for section A', or 'Generate fee collection report'.`;
          suggestedActions = [
            { text: "Fees due" },
            { text: "Payment status" },
            { text: "Collection report" }
          ];
          break;
        default:
          welcomeContent = `Hello ${displayName} 👋 — I can help with your timetable, attendance, fees, and notices. Try: 'When is my next class?', 'Who was absent in DBMS today?', or 'Show pending fees for section A'.`;
          suggestedActions = [
            { text: "Next class" },
            { text: "Fees due" },
            { text: "Mark attendance" },
            { text: "Department summary" }
          ];
      }
      
      const welcomeMessage: ChatMessage = {
        role: 'assistant',
        content: welcomeContent,
        timestamp: new Date(),
        suggested_actions: suggestedActions
      };
      setMessages([welcomeMessage]);
    }
  }, [sessionId]);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`assistant_chat_${sessionId}`, JSON.stringify(messages));
    }
  }, [messages, sessionId]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K or '/' to open/close
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K') || e.key === '/') {
        e.preventDefault();
        toggleAssistant();
      }
      // Esc to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const toggleAssistant = () => {
    setIsOpen(!isOpen);
  };

  const closeAssistant = () => {
    setIsOpen(false);
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetchWithTokenRefresh(`${API_BASE_URL}/ai-chatbot/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue
        }),
      });

      console.log('Response received, status:', response.status, 'ok:', response.ok);

      if (response.ok) {
        const responseText = await response.text();
        console.log('Raw response text:', responseText);
        
        try {
          const data = JSON.parse(responseText);
          console.log('Parsed data:', data);
          
          const botMessage: ChatMessage = {
            role: 'assistant',
            content: data.response || "I'm not sure how to help with that.",
            timestamp: new Date(),
            ui_cards: data.ui_cards || [],
            suggested_actions: data.suggested_actions || []
          };
          
          setMessages(prev => [...prev, botMessage]);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          // If JSON parsing fails, treat the response as plain text
          const botMessage: ChatMessage = {
            role: 'assistant',
            content: responseText || "I'm not sure how to help with that.",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, botMessage]);
        }
      } else {
        const errorText = await response.text();
        console.error('Response error:', response.status, response.statusText, errorText);
        throw new Error(`AI request failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to get response from AI assistant. Please try again.',
      });
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedAction = (actionText: string) => {
    setInputValue(actionText);
    
    // Auto-scroll to the input area
    setTimeout(() => {
      if (panelRef.current) {
        const messagesContainer = panelRef.current.querySelector('.h-80');
        if (messagesContainer) {
          messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    }, 50);
    
    // Auto-send after a short delay to improve UX
    setTimeout(() => {
      const sendButton = document.getElementById('send-button');
      if (sendButton) {
        sendButton.click();
      }
    }, 150);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Render UI cards
  const renderUICards = (cards: UICard[]) => {
    if (!cards || cards.length === 0) return null;
    
    return (
      <div className="mt-3 space-y-2">
        {cards.map((card, index) => (
          <div 
            key={index} 
            className={`p-3 rounded-lg border ${
              theme === 'dark' 
                ? 'bg-card border-border text-card-foreground' 
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            {card.title && (
              <h4 className="font-semibold mb-1">{card.title}</h4>
            )}
            {card.subtitle && (
              <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                {card.subtitle}
              </p>
            )}
            {card.key_values && (
              <div className="space-y-1">
                {Object.entries(card.key_values).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>
                      {key}:
                    </span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            )}
            {card.actions && card.actions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {card.actions.map((action, actionIndex) => (
                  <button
                    key={actionIndex}
                    className={`px-2 py-1 text-xs rounded ${
                      theme === 'dark'
                        ? 'bg-primary/10 text-primary hover:bg-primary/20'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {(action as { label?: string }).label || 'Action'}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render suggested actions
  const renderSuggestedActions = (actions: SuggestedAction[]) => {
    if (!actions || actions.length === 0) return null;
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-wrap gap-2 mt-3"
      >
        {actions.map((action, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSuggestedAction(action.text)}
            className={`px-3 py-1.5 text-sm rounded-full transition-all duration-200 ${
              theme === 'dark'
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            {action.text}
          </motion.button>
        ))}
      </motion.div>
    );
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{ 
          scale: [1, 1.1, 1, 1.05, 1],
          boxShadow: [
            '0 0 0 0 rgba(162, 89, 255, 0.7)',
            '0 0 0 10px rgba(162, 89, 255, 0.3)',
            '0 0 0 20px rgba(162, 89, 255, 0)',
          ],
          transition: { 
            duration: 3,
            repeat: Infinity,
            repeatType: "reverse" 
          } 
        }}
        onClick={toggleAssistant}
        aria-label="Open Campus Assistant"
        className="fixed z-50 right-7 bottom-6 w-10 h-10 rounded-full shadow-2xl flex items-center justify-center ring-2 ring-offset-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all duration-300"
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0],
            transition: {
              duration: 4,
              repeat: Infinity,
              repeatType: "reverse"
            }
          }}
        >
          <Sparkles className="w-5 h-5" />
        </motion.div>
      </motion.button>

      {/* Assistant Panel */}
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 300,
            damping: 25,
            duration: 0.3 
          }}
          className={`fixed z-50 right-6 bottom-24 w-104 max-w-sm rounded-2xl shadow-2xl p-3 ${
            theme === 'dark' 
              ? 'bg-slate-900 border border-slate-700' 
              : 'bg-white border border-gray-200'
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-3 py-2 border-b ${
            theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Campus Assistant</h3>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                  You: {getUserInfo().user_role}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={closeAssistant}
                aria-label="Close"
                className={`p-1.5 rounded-full ${
                  theme === 'dark' 
                    ? 'hover:bg-slate-800 text-slate-400' 
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="mt-3">
              <div className="h-80 overflow-y-auto px-3 space-y-4 custom-scrollbar">
                {messages.map((message, index) => (
                  <div 
                    key={index} 
                    className={`${
                      message.role === 'user' 
                        ? 'ml-auto max-w-[80%]' 
                        : 'max-w-[85%]'
                    }`}
                  >
                    <div
                      className={`p-3 rounded-xl ${
                        message.role === 'user'
                          ? theme === 'dark'
                            ? 'bg-indigo-600 text-white ml-auto'
                            : 'bg-indigo-600 text-white ml-auto'
                          : theme === 'dark'
                            ? 'bg-slate-800 text-slate-100'
                            : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      {message.ui_cards && renderUICards(message.ui_cards)}
                      {message.suggested_actions && renderSuggestedActions(message.suggested_actions)}
                    </div>
                    <div className={`text-xs mt-1 ${
                      theme === 'dark' ? 'text-slate-500' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="max-w-[85%]">
                    <div className={`p-3 rounded-xl ${
                      theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                    }`}>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 rounded-full bg-current animate-bounce"></div>
                        <div 
                          className="w-2 h-2 rounded-full bg-current animate-bounce" 
                          style={{ animationDelay: '0.2s' }}
                        ></div>
                        <div 
                          className="w-2 h-2 rounded-full bg-current animate-bounce" 
                          style={{ animationDelay: '0.4s' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className={`mt-3 pt-3 border-t ${
                theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
              }`}>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Ask me anything..."
                    disabled={isLoading}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm outline-none ${
                      theme === 'dark'
                        ? 'bg-slate-800 text-white border border-slate-700 focus:ring-2 focus:ring-indigo-500'
                        : 'bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-indigo-500'
                    }`}
                  />
                  <button
                    id="send-button"
                    onClick={sendMessage}
                    disabled={isLoading || !inputValue.trim()}
                    aria-label="Send message"
                    className={`p-2 rounded-lg ${
                      isLoading || !inputValue.trim()
                        ? theme === 'dark'
                          ? 'bg-slate-800 text-slate-500'
                          : 'bg-gray-100 text-gray-400'
                        : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          
        </motion.div>
      )}
    </>
  );
};

export default FloatingAssistant;