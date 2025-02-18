import { useMemo } from 'react';
import { Task } from '../store';

export function useTaskStats(tasks: Task[]) {
  return useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((task) => task.status === 'pending').length;
    const inProgress = tasks.filter((task) => task.status === 'in-progress').length;
    const completed = tasks.filter((task) => task.status === 'completed').length;
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const pendingRate = total > 0 ? Math.round((pending / total) * 100) : 0;
    const inProgressRate = total > 0 ? Math.round((inProgress / total) * 100) : 0;

    const highPriority = tasks.filter((task) => task.aiPriority && task.aiPriority >= 8).length;
    const mediumPriority = tasks.filter((task) => task.aiPriority && task.aiPriority >= 5 && task.aiPriority < 8).length;
    const lowPriority = tasks.filter((task) => task.aiPriority && task.aiPriority < 5).length;

    return {
      total,
      pending,
      inProgress,
      completed,
      completionRate,
      pendingRate,
      inProgressRate,
      highPriority,
      mediumPriority,
      lowPriority,
    };
  }, [tasks]);
}