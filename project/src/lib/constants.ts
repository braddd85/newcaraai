// Theme Configuration
export const THEME = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

// Color Configuration
export const COLORS = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
} as const;

// AI Assistant Configuration
export const AI_CONFIG = {
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY_MS: 2000,
  },
  VOICE: {
    DEFAULT_RATE: 1.0,
    DEFAULT_PITCH: 1.0,
    DEFAULT_VOLUME: 1.0,
  },
  GENERATION: {
    TEMPERATURE: 0.7,
    TOP_P: 0.8,
    TOP_K: 40,
    MAX_TOKENS: 250,
  },
};

// Chat Interface Configuration
export const CHAT_CONFIG = {
  INITIAL_MESSAGE: "Hi, I'm Cara! I can assist you with automotive repair, insurance claims, and organizing tasks. Just describe what needs to be done, and I'll help organize it.",
  ERROR_MESSAGE: "⚠️ I apologize, but I'm having trouble processing your request. Please try rephrasing your message or try again in a moment.",
  TASK_CREATED_SUFFIX: "\n\n✅ I've created a task for you based on your message. You can find it in your task list.",
};

// Task Priority Levels
export const PRIORITY_LEVELS = {
  HIGH: 8,
  MEDIUM: 5,
  LOW: 3,
};

// Task Status Options
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
} as const;

// Default Filters
export const DEFAULT_FILTERS = {
  status: 'all',
  search: '',
  dealership: '',
  hasInsurance: null,
  minPriority: 0,
};