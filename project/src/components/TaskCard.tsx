import { useState, useRef } from 'react';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Task } from '../lib/store';
import { Clock, Building2, FileText, Sparkles, AlertTriangle, Loader2, ChevronDown, ChevronUp, CheckCircle2, Edit, UserPlus2, Trash2, CalendarClock, RepeatIcon } from 'lucide-react';
import { summarizeTask, suggestNextSteps, generateCompletionStrategy } from '../lib/ai';
import { useEffect, useCallback } from 'react';
import { debounce } from '../lib/utils';
import { useTaskStore } from '../lib/store';

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const { tasks } = useTaskStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(task.description);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [aiContent, setAiContent] = useState<{
    isLoading: boolean;
    summary: string;
    nextSteps: string[];
    completionStrategy?: string;
    error: string | null;
  }>({
    isLoading: false,
    summary: '',
    nextSteps: [],
    completionStrategy: undefined,
    error: null
  });

  // Create a debounced save function
  const debouncedSave = useCallback(
    debounce(async (newDescription: string) => {
      if (!task.id) return;
      
      setSaveStatus('saving');
      try {
        const taskRef = doc(db, 'tasks', task.id);
        await updateDoc(taskRef, {
          description: newDescription,
          updatedAt: serverTimestamp(),
        });
        setSaveStatus('saved');
      } catch (error) {
        console.error('Error saving changes:', error);
        setSaveStatus('error');
      }
    }, 1000),
    [task.id]
  );

  // Handle description changes
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value;
    setEditedDescription(newDescription);
    setSaveStatus('saving');
    debouncedSave(newDescription);
  };

  useEffect(() => {
    const checkDeadline = async () => {
      if (!task.deadline || task.reminderSent || task.status === 'completed') return;

      const deadlineDate = new Date(task.deadline);
      const now = new Date();
      const hoursUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilDeadline <= 48 && hoursUntilDeadline > 0) {
        const similarTasks = tasks.filter(t => 
          t.id !== task.id && 
          t.status === 'completed' &&
          (t.dealership === task.dealership || t.insuranceClaim)
        );

        const strategy = await generateCompletionStrategy(task, similarTasks);
        
        setAiContent(prev => ({
          ...prev,
          completionStrategy: strategy
        }));

        const taskRef = doc(db, 'tasks', task.id);
        await updateDoc(taskRef, {
          reminderSent: true
        });
      }
    };

    checkDeadline();
  }, [task, tasks]);

  const handleStatusChange = async (newStatus: Task['status']) => {
    if (!task.id) return;
    
    const taskRef = doc(db, 'tasks', task.id);
    await updateDoc(taskRef, {
      status: newStatus,
      updatedAt: new Date(),
    }).catch((error) => {
      console.error('Error updating task:', error);
    });
  };

  const handleComplete = async () => {
    await handleStatusChange('completed');
  };

  const handleDelete = async () => {
    if (!task.id) return;
    try {
      await deleteDoc(doc(db, 'tasks', task.id));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleAIAssist = async () => {
    setAiContent(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const [taskSummary, steps] = await Promise.all([
        summarizeTask(task.description),
        suggestNextSteps(task.description),
      ]);
      setAiContent(prev => ({
        ...prev,
        summary: taskSummary,
        nextSteps: steps,
        isLoading: false
      }));
    } catch (error) {
      console.error('AI assistance failed:', error);
      setAiContent(prev => ({
        ...prev,
        error: 'Failed to generate AI insights. Please try again.',
        isLoading: false
      }));
    }
  };

  useEffect(() => {
    handleAIAssist();
  }, [task.description]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    if (cardRef.current) {
      cardRef.current.classList.add('opacity-50');
    }
  };

  const handleDragEnd = () => {
    if (cardRef.current) {
      cardRef.current.classList.remove('opacity-50');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const draggedTaskId = e.dataTransfer.getData('text/plain');
    if (draggedTaskId !== task.id) {
      useTaskStore.getState().reorderTasks(draggedTaskId, task.order);
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          icon: '🟡'
        };
      case 'in-progress':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          icon: '🔵'
        };
      case 'completed':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          icon: '🟢'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          icon: '⚪'
        };
    }
  };

  return (
    <div 
      ref={cardRef}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`dark-mode-transition rounded-lg shadow-sm hover:shadow-lg ${
        task.aiPriority && task.aiPriority >= 8 
          ? 'ring-1 ring-red-400/50 dark:ring-red-400/30' 
          : ''
      } transform hover:-translate-y-1 cursor-grab active:cursor-grabbing
        bg-white dark:bg-dark-card 
        hover:bg-gray-50 dark:hover:bg-dark-hover
        text-gray-900 dark:text-dark-text-primary
        border border-gray-200/80 dark:border-dark-border/50
        backdrop-blur-sm`}
    >
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                {task.title}
              </h3>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="ml-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-500 dark:text-dark-text-secondary"
                aria-label={isExpanded ? "Collapse task" : "Expand task"}
              >
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 mb-4">
          <button
            onClick={handleComplete}
            disabled={task.status === 'completed'}
            className="inline-flex items-center px-2 py-1 text-sm font-medium rounded-md 
              text-green-700 dark:text-green-300
              bg-green-50 dark:bg-green-900/40
              hover:bg-green-100 dark:hover:bg-green-900/60
              disabled:opacity-50 disabled:cursor-not-allowed
              transform active:scale-95 transition-all duration-200"
            title="Mark Complete"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Complete
          </button>
          <button
            onClick={() => {/* TODO: Implement edit */}}
            className="inline-flex items-center px-2 py-1 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transform active:scale-95 transition-transform dark:bg-blue-900 dark:text-blue-100"
            title="Edit Task"
          >
            <Edit className="h-4 w-4 mr-1" />
            {isEditing ? 'Done' : 'Edit'}
          </button>
          <button
            onClick={() => {/* TODO: Implement reassign */}}
            className="inline-flex items-center px-2 py-1 text-sm font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 transform active:scale-95 transition-transform dark:bg-purple-900 dark:text-purple-100"
            title="Reassign Task"
          >
            <UserPlus2 className="h-4 w-4 mr-1" />
            Reassign
          </button>
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="inline-flex items-center px-2 py-1 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 transform active:scale-95 transition-transform dark:bg-red-900 dark:text-red-100"
            title="Delete Task"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </button>
        </div>

        {showConfirmDelete && (
          <div className="mb-4 p-3 bg-red-50 rounded-md dark:bg-red-900">
            <p className="text-sm text-red-700 mb-2">Are you sure you want to delete this task?</p>
            <div className="flex space-x-2">
              <button
                onClick={handleDelete}
                className="px-3 py-1 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transform active:scale-95 transition-transform"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-3 py-1 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 transform active:scale-95 transition-transform dark:bg-gray-700 dark:text-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {task.aiPriority && task.aiPriority >= 8 && (
          <div className="flex items-center space-x-2 mb-4 p-2 bg-red-50 rounded-md dark:bg-red-900">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium text-red-700">High Priority Task</span>
          </div>
        )}

        <div className={`${isExpanded ? '' : 'hidden'}`}>
          {task.aiPriority !== undefined && (
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <div className="h-2.5 flex-grow bg-gray-200/50 dark:bg-gray-700/30 rounded-full overflow-hidden backdrop-blur-sm">
                <div 
                  className="h-full gradient-priority-bar transition-all duration-300"
                  style={{ width: `${task.aiPriority * 10}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                Priority: {task.aiPriority}
              </span>
            </div>
          </div>
          )}

        <p className="text-gray-600 dark:text-dark-text-secondary mb-4 leading-relaxed text-sm">
          {task.description}
        </p>
        {isEditing ? (
          <div className="relative mb-4">
            <textarea
              value={editedDescription}
              onChange={handleDescriptionChange}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Task description..."
            />
            <div className="absolute right-2 bottom-2 flex items-center space-x-2">
              {saveStatus === 'saving' && (
                <span className="text-gray-500 text-sm flex items-center">
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-green-500 text-sm">
                  ✓ Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-red-500 text-sm">
                  Failed to save
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="relative mb-4">
            <p className="text-gray-600">{task.description}</p>
            <button
              onClick={() => {
                setIsEditing(true);
                setEditedDescription(task.description);
              }}
              className="absolute top-0 right-0 p-1 text-gray-400 hover:text-gray-600"
            >
              <Edit className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="space-y-3">
          {task.dealership && (
            <div className="flex items-center text-sm text-gray-500">
              <Building2 className="h-4 w-4 mr-2" />
              {task.dealership}
            </div>
          )}
          {task.insuranceClaim && (
            <div className="flex items-center text-sm text-gray-500">
              <FileText className="h-4 w-4 mr-2" />
              Claim: {task.insuranceClaim}
            </div>
          )}
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-2" />
            {new Date(task.updatedAt).toLocaleDateString()}
            {task.recurrence && (
              <div className="ml-4 flex items-center text-blue-600">
                <RepeatIcon className="h-4 w-4 mr-1" />
                <span>
                  Repeats {task.recurrence.frequency}
                  {task.recurrence.interval > 1 ? ` (every ${task.recurrence.interval} ${task.recurrence.frequency}s)` : ''}
                </span>
              </div>
            )}
            {task.deadline && (
              <div className="ml-4 flex items-center">
                <CalendarClock className="h-4 w-4 mr-2 text-orange-500" />
                <span className={`${
                  new Date(task.deadline).getTime() - new Date().getTime() < 48 * 60 * 60 * 1000
                  ? 'text-orange-600 font-medium'
                  : ''
                }`}>
                  Due: {new Date(task.deadline).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                getStatusColor(task.status).bg
              } ${getStatusColor(task.status).text}`}
            >
              <span className="mr-1">{getStatusColor(task.status).icon}</span>
              {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
            </span>
            {aiContent.isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            )}
          </div>
        </div>

        {isExpanded && !aiContent.error ? (
          aiContent.summary && (
            <div className="mt-4 p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-lg border border-gray-200/50 dark:border-gray-700/30 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <h4 className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                  AI Analysis
                </h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary leading-relaxed tracking-wide">
                {aiContent.summary}
              </p>
              {aiContent.nextSteps.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-dark-text-primary mb-1">
                    Recommended Steps
                  </h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 dark:text-dark-text-secondary space-y-2 pl-1">
                    {aiContent.nextSteps.map((step, index) => (
                      <li key={index} className="pl-1">{step}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiContent.completionStrategy && (
                <div className="mt-4 border-t border-gray-200/50 dark:border-gray-700/30 pt-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                    <h4 className="text-sm font-medium text-orange-700 dark:text-orange-300">
                      Deadline Approaching
                    </h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-3">
                    This task is due within 48 hours. Here's a suggested completion strategy:
                  </p>
                  <p className="text-sm text-gray-800 dark:text-orange-200 bg-orange-50/80 dark:bg-orange-950/30 p-4 rounded-lg border border-orange-100 dark:border-orange-900/30">
                    {aiContent.completionStrategy}
                  </p>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="mt-4 p-4 bg-red-50/80 dark:bg-red-950/30 rounded-lg border border-red-100 dark:border-red-900/30">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
              <p className="text-sm text-red-600 dark:text-red-200">{aiContent.error}</p>
            </div>
            <button
              onClick={handleAIAssist}
              className="mt-3 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
            >
              Retry Analysis
            </button>
          </div>
        )}

        {isExpanded && task.aiSuggestion && (
          <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-purple-700">AI Suggested Action</span>
            </div>
            <p className="text-sm text-gray-600">{task.aiSuggestion}</p>
          </div>
        )}

        <div className="mt-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Status:</span>
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value as Task['status'])}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {isExpanded && (
            <button
              onClick={handleAIAssist}
              disabled={aiContent.isLoading}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transform active:scale-95 transition-transform"
            >
              {aiContent.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Refresh Analysis'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}