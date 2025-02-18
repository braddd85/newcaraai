import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Loader2, MessageCircle, MinimizeIcon, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { chatWithCara, extractTaskFromMessage, createTaskFromChat } from '../lib/ai';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { useVoice } from '../lib/hooks';
import { CHAT_CONFIG } from '../lib/constants';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  taskId?: string;
}

export default function ChatInterface() {
  const [user] = useAuthState(auth);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: CHAT_CONFIG.INITIAL_MESSAGE,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    isListening, 
    isSpeaking,
    toggleListening, 
    toggleSpeaking,
    speak,
    isVoiceSupported,
    isSpeechSupported 
  } = useVoice({
    onTranscript: (transcript) => {
      setInput(transcript);
      handleSubmit(new Event('submit') as any);
    }
  });

  // Auto-close chat when clicking outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    const chatBox = document.getElementById('chat-interface');
    if (chatBox && !chatBox.contains(event.target as Node)) {
      setIsExpanded(false);
    }
  }, []);

  useEffect(() => {
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded, handleClickOutside]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !user) return;

    let currentMessages = [...messages];
    const userMessage = { role: 'user' as const, text: input.trim() };

    setInput('');
    setIsLoading(true);
    setMessages([...currentMessages, userMessage]);

    try {
      // Extract potential task from message
      let taskData = await extractTaskFromMessage(userMessage.text);
      let taskId: string | undefined;

      if (taskData) {
        try {
          taskId = await createTaskFromChat(taskData, user.uid);
        } catch (error) {
          console.error('Error creating task:', error);
          // Continue with chat even if task creation fails
        }
      }
      
      // Get AI response
      const response = await chatWithCara(userMessage.text, currentMessages);
      const assistantMessage = response.trim() + (taskId ? CHAT_CONFIG.TASK_CREATED_SUFFIX : '');

      // Speak the response if speaking is enabled
      if (isSpeaking) {
        speak(assistantMessage);
      }

      const newMessages = [
        ...currentMessages,
        userMessage,
        { role: 'assistant' as const, text: assistantMessage, taskId }
      ];
      setMessages(newMessages);
    } catch (error) {
      console.error('Chat error:', error);
      // Add more specific error handling
      const errorMessage = error instanceof Error 
        ? `Error: ${error.message}`
        : CHAT_CONFIG.ERROR_MESSAGE;

      const errorMessages = [
        ...currentMessages,
        userMessage,
        {
          role: 'assistant',
          text: errorMessage,
        },
      ];
      setMessages(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="chat-interface"
      className={`fixed transition-all duration-300 ${
        isExpanded ? 'bottom-6 right-6 w-96 h-[600px]' : 'bottom-6 right-6 w-auto h-auto'
      }`}
    >
      {isExpanded ? (
        <div className="bg-white rounded-lg shadow-xl flex flex-col h-full">
          {/* Chat Header */}
          <div className="p-4 border-b bg-blue-600 text-white rounded-t-lg flex justify-between items-center">
            <h2 className="text-lg font-semibold">Chat with Cara AI</h2>
            <button onClick={() => setIsExpanded(false)} className="hover:text-gray-200">
              <MinimizeIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.taskId
                      ? 'bg-green-100 text-gray-900 border border-green-300'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  {message.taskId && <div className="mt-2 text-xs text-green-700">✓ Task created</div>}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Cara a question..."
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-3 pr-3 py-2"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-md transition-colors ${
                  isListening
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={toggleSpeaking}
                className={`p-2 rounded-md transition-colors ${
                  isSpeaking
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={isSpeaking ? 'Stop speaking' : 'Enable voice response'}
              >
                {isSpeaking ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </button>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="inline-flex items-center p-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-blue-600 rounded-full shadow-lg p-3 cursor-pointer hover:bg-blue-700 transition-colors">
          <button onClick={() => setIsExpanded(true)} className="text-white" aria-label="Open chat">
            <MessageCircle className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}