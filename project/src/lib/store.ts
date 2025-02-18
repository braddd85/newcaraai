import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
}

interface TaskState {
  tasks: Task[];
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  reorderTasks: (taskId: string, newOrder: number) => void;
}

export interface Task {
  id: string;
  title: string;
  order: number;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo: string;
  dealership?: string;
  insuranceClaim?: string;
  createdAt: Date;
  deadline?: Date;
  updatedAt: Date;
  aiSuggestion?: string;
  aiPriority?: number;
  reminderSent?: boolean;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    nextDue?: Date;
    endDate?: Date;
  };
}

export type SortOption = 'date' | 'status' | 'priority';
export type FilterOption = {
  status: Task['status'] | 'all';
  search: string;
  dealership: string;
  hasInsurance: boolean | null;
  minPriority: number;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  theme: 'light',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, ...updates } : task
      ).sort((a, b) => (b.aiPriority || 0) - (a.aiPriority || 0)),
    })),
  reorderTasks: (taskId, newOrder) =>
    set((state) => ({
      tasks: state.tasks.map((task) => {
        if (task.id === taskId) {
          return { ...task, order: newOrder };
        }
        if (task.order >= newOrder) {
          return { ...task, order: task.order + 1 };
        }
        return task;
      }).sort((a, b) => a.order - b.order),
    })),
}));