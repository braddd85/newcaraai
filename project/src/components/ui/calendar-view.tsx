import React from 'react';
import { Task } from '../../lib/store';

interface CalendarViewProps {
  tasks: Task[];
  className?: string;
}

export function CalendarView({ tasks, className = '' }: CalendarViewProps) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      const taskDate = new Date(task.deadline || task.createdAt);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  };

  return (
    <div className={`calendar-grid ${className}`}>
      {days.map(day => (
        <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400">
          {day}
        </div>
      ))}
      {weekDays.map((date, i) => {
        const dayTasks = getTasksForDate(date);
        const isToday = date.toDateString() === today.toDateString();
        
        return (
          <div
            key={i}
            className={`calendar-day ${dayTasks.length > 0 ? 'has-tasks' : ''} ${
              isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
            }`}
          >
            <div className="text-sm font-medium mb-1">
              {date.getDate()}
            </div>
            {dayTasks.length > 0 && (
              <div className="space-y-1">
                {dayTasks.map(task => (
                  <div
                    key={task.id}
                    className={`text-xs truncate rounded px-1 py-0.5 ${
                      task.aiPriority && task.aiPriority >= 8
                        ? 'bg-red-500/20 text-red-200'
                        : task.aiPriority && task.aiPriority >= 5
                        ? 'bg-yellow-500/20 text-yellow-200'
                        : 'bg-green-500/20 text-green-200'
                    }`}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}