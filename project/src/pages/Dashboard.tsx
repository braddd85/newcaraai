import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useTaskStore, Task, SortOption, FilterOption } from '../lib/store';
import { Search, Plus, LogOut, Filter, Loader2, AlertTriangle, SortAsc, Moon, Sun } from 'lucide-react';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import ChatInterface from '../components/ChatInterface';
import { calculateTaskPriority } from '../lib/ai';
import { testConnections } from '../lib/test-connections';

export default function Dashboard() {
  const [user] = useAuthState(auth);
  const { theme, toggleTheme } = useTaskStore();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const { tasks, setTasks } = useTaskStore();
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<{
    firebase: { connected: boolean; error: string | null };
    gemini: { connected: boolean; error: string | null };
  } | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [filters, setFilters] = useState<FilterOption>({
    status: 'all',
    search: '',
    dealership: '',
    hasInsurance: null,
    minPriority: 0,
  });

  useEffect(() => {
    const checkConnections = async () => {
      const status = await testConnections();
      setConnectionStatus(status);
    };
    checkConnections();
  }, []);

  useEffect(() => {
    if (!user) return;

    try {
      const q = query(
        collection(db, 'tasks'),
        where('assignedTo', '==', user.uid)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const taskData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })).sort((a, b) => (b.aiPriority || 0) - (a.aiPriority || 0)) as Task[];
          setTasks(taskData);
          setLoading(false);

          // Calculate AI priority for tasks without it
          taskData.forEach(async (task) => {
            if (task.aiPriority === undefined) {
              const priority = await calculateTaskPriority(task);
              const taskRef = doc(db, 'tasks', task.id);
              await updateDoc(taskRef, { aiPriority: priority });
            }
          });
        },
        (error) => {
          console.error('Error fetching tasks:', error);
          setTasks([]);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up task listener:', error);
      setTasks([]);
      setLoading(false);
    }
  }, [user, setTasks]);

  useEffect(() => {
    const filtered = tasks.filter((task) =>
      (filters.status === 'all' || task.status === filters.status) &&
      (filters.search === '' || 
        task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.description.toLowerCase().includes(filters.search.toLowerCase())) &&
      (filters.dealership === '' || 
        task.dealership?.toLowerCase().includes(filters.dealership.toLowerCase())) &&
      (filters.hasInsurance === null || 
        (filters.hasInsurance ? !!task.insuranceClaim : !task.insuranceClaim)) &&
      ((task.aiPriority || 0) >= filters.minPriority)
    );

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        case 'priority':
        default:
          return (b.aiPriority || 0) - (a.aiPriority || 0);
      }
    });

    setFilteredTasks(sorted);
  }, [tasks, filters, sortBy]);

  const taskStats = {
    total: tasks.length,
    pending: tasks.filter((task) => task.status === 'pending').length,
    inProgress: tasks.filter((task) => task.status === 'in-progress').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      theme === 'dark' ? 'bg-slate-900' : 'bg-gray-100'
    } dark-mode-transition`}>
      <header className={`${
        theme === 'dark' ? 'bg-slate-800/95 border-slate-700/50' : 'bg-white'
      } shadow-sm border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Cara AI Dashboard</h1>
              {connectionStatus && (
                <div className="mt-2 flex space-x-4 text-sm">
                  <span className={`flex items-center ${
                    connectionStatus.firebase.connected ? 'text-green-600' : 'text-red-600'
                  }`}>
                    Firebase: {connectionStatus.firebase.connected ? 'Connected' : 'Error'}
                    {connectionStatus.firebase.error && ` - ${connectionStatus.firebase.error}`}
                  </span>
                  <span className={`flex items-center ${
                    connectionStatus.gemini.connected ? 'text-green-600' : 'text-red-600'
                  }`}>
                    Gemini AI: {connectionStatus.gemini.connected ? 'Connected' : 'Error'}
                    {connectionStatus.gemini.error && ` - ${connectionStatus.gemini.error}`}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-full ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                } transition-colors duration-200`}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  className={`pl-10 pr-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark-mode-transition ${
                    theme === 'dark'
                      ? 'bg-slate-700/50 border-slate-600/50 text-white placeholder-gray-400 backdrop-blur-sm'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              <div className="flex space-x-2">
                <div className="relative">
                  <Filter className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as Task['status'] | 'all' })}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Filter by dealership..."
                  className="pl-4 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={filters.dealership}
                  onChange={(e) => setFilters({ ...filters, dealership: e.target.value })}
                />
                <select
                  value={filters.hasInsurance === null ? '' : filters.hasInsurance.toString()}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    hasInsurance: e.target.value === '' ? null : e.target.value === 'true'
                  })}
                  className="pl-4 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Any Insurance</option>
                  <option value="true">Has Insurance</option>
                  <option value="false">No Insurance</option>
                </select>
                <select
                  value={filters.minPriority}
                  onChange={(e) => setFilters({ ...filters, minPriority: parseInt(e.target.value) })}
                  className="pl-4 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="0">Any Priority</option>
                  <option value="8">High Priority (8+)</option>
                  <option value="5">Medium Priority (5+)</option>
                  <option value="3">Low Priority (3+)</option>
                </select>
                <div className="relative">
                  <SortAsc className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="priority">Sort by Priority</option>
                    <option value="date">Sort by Date</option>
                    <option value="status">Sort by Status</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => auth.signOut()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transform active:scale-95 transition-transform"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className={`${
            theme === 'dark' ? 'bg-slate-800/90 border-slate-700/50' : 'bg-white border-gray-200'
          } p-4 rounded-lg shadow-sm border dark-mode-transition backdrop-blur-sm`}
        >
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tasks</div>
          <div className={`mt-1 text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {taskStats.total}
          </div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {taskStats.completed > 0 && (
              <span>{Math.round((taskStats.completed / taskStats.total) * 100)}% Complete</span>
            )}
          </div>
        </div>
        <div className={`${
          theme === 'dark' ? 'bg-slate-800/90 border-slate-700/50' : 'bg-white border-gray-200'
        } p-4 rounded-lg shadow-sm border dark-mode-transition backdrop-blur-sm`}
        >
          <div className="text-sm font-medium text-yellow-500 dark:text-yellow-400">Pending</div>
          <div className={`mt-1 text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {taskStats.pending}
          </div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {taskStats.total > 0 && (
              <span>{Math.round((taskStats.pending / taskStats.total) * 100)}% of Total</span>
            )}
          </div>
        </div>
        <div className={`${
          theme === 'dark' ? 'bg-slate-800/90 border-slate-700/50' : 'bg-white border-gray-200'
        } p-4 rounded-lg shadow-sm border dark-mode-transition backdrop-blur-sm`}
        >
          <div className="text-sm font-medium text-blue-500 dark:text-blue-400">In Progress</div>
          <div className={`mt-1 text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {taskStats.inProgress}
          </div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {taskStats.total > 0 && (
              <span>{Math.round((taskStats.inProgress / taskStats.total) * 100)}% of Total</span>
            )}
          </div>
        </div>
        <div className={`${
          theme === 'dark' ? 'bg-slate-800/90 border-slate-700/50' : 'bg-white border-gray-200'
        } p-4 rounded-lg shadow-sm border dark-mode-transition backdrop-blur-sm`}
        >
          <div className="text-sm font-medium text-green-500 dark:text-green-400">Completed</div>
          <div className={`mt-1 text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {taskStats.completed}
          </div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {taskStats.total > 0 && (
              <span>{Math.round((taskStats.completed / taskStats.total) * 100)}% of Total</span>
            )}
          </div>
        </div>
      </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your Tasks</h2>
          <button
            onClick={() => setShowTaskForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transform hover:-translate-y-1 transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task, index) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            <p className="text-gray-500 text-lg">No tasks found</p>
            <p className="text-gray-400 text-sm mt-2">
              {filters.search || filters.status !== 'all'
                ? 'Try adjusting your filters'
                : 'Click the "New Task" button to create your first task'}
            </p>
          </div>
        )}

        {showTaskForm && <TaskForm onClose={() => setShowTaskForm(false)} />}
        <ChatInterface />
      </main>
    </div>
  );
}