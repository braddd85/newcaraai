import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { X, Calendar, RepeatIcon } from 'lucide-react';
import { generateNextAction } from '../lib/ai';
import { Task } from '../lib/store';

interface TaskFormProps {
  onClose: () => void;
}

export default function TaskForm({ onClose }: TaskFormProps) {
  const [user] = useAuthState(auth);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dealership, setDealership] = useState('');
  const [insuranceClaim, setInsuranceClaim] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateNextDueDate = (startDate: Date): Date => {
    const next = new Date(startDate);
    
    switch (recurrenceFrequency) {
      case 'daily':
        next.setDate(next.getDate() + recurrenceInterval);
        break;
      case 'weekly':
        if (selectedDays.length > 0) {
          // Find the next selected day of the week
          const currentDay = next.getDay();
          const nextDay = selectedDays.find(day => day > currentDay) ?? selectedDays[0];
          const daysToAdd = nextDay > currentDay ? nextDay - currentDay : 7 - currentDay + nextDay;
          next.setDate(next.getDate() + daysToAdd);
        } else {
          next.setDate(next.getDate() + (7 * recurrenceInterval));
        }
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + recurrenceInterval);
        next.setDate(dayOfMonth);
        break;
    }
    
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    setError('');
    try {
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        dealership: dealership.trim(),
        insuranceClaim: insuranceClaim.trim(),
        deadline: deadline ? new Date(deadline) : undefined,
        recurrence: isRecurring ? {
          frequency: recurrenceFrequency,
          interval: recurrenceInterval,
          daysOfWeek: recurrenceFrequency === 'weekly' ? selectedDays : undefined,
          dayOfMonth: recurrenceFrequency === 'monthly' ? dayOfMonth : undefined,
          nextDue: deadline ? calculateNextDueDate(new Date(deadline)) : undefined,
          endDate: recurrenceEndDate ? new Date(recurrenceEndDate) : undefined
        } : undefined
      };

      const aiSuggestion = await generateNextAction(taskData);
      
      const newTask: Omit<Task, 'id'> = {
        ...taskData,
        status: 'pending',
        assignedTo: user.uid,
        aiSuggestion,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, 'tasks'), newTask);
      onClose();
    } catch (err) {
      const error = err as Error;
      console.error('Error creating task:', error);
      if (error.message.includes('permission-denied')) {
        setError('You do not have permission to create tasks');
      } else {
        setError('Failed to create task. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-semibold mb-4">Create New Task</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              required
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Dealership
            </label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={dealership}
              onChange={(e) => setDealership(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Insurance Claim #
            </label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={insuranceClaim}
              onChange={(e) => setInsuranceClaim(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Deadline
            </label>
            <input
              type="datetime-local"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="recurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="recurring" className="text-sm font-medium text-gray-700 flex items-center">
                <RepeatIcon className="h-4 w-4 mr-1" />
                Recurring Task
              </label>
            </div>

            {isRecurring && (
              <div className="pl-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Frequency
                  </label>
                  <select
                    value={recurrenceFrequency}
                    onChange={(e) => setRecurrenceFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Repeat every
                  </label>
                  <div className="flex items-center space-x-2 mt-1">
                    <input
                      type="number"
                      min="1"
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(parseInt(e.target.value))}
                      className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                    <span className="text-sm text-gray-500">
                      {recurrenceFrequency === 'daily' ? 'days' :
                       recurrenceFrequency === 'weekly' ? 'weeks' : 'months'}
                    </span>
                  </div>
                </div>

                {recurrenceFrequency === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Repeat on
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setSelectedDays(prev =>
                              prev.includes(index)
                                ? prev.filter(d => d !== index)
                                : [...prev, index].sort()
                            );
                          }}
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            selectedDays.includes(index)
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {recurrenceFrequency === 'monthly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Day of month
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                      className="mt-1 block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}