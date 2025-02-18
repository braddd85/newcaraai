import { useCallback } from 'react';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Task } from '../store';
import { calculateTaskPriority } from '../ai';

export function useTaskActions() {
  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    if (!taskId) return;
    
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error('Error updating task:', error);
      return false;
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!taskId) return;
    
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  }, []);

  const recalculatePriority = useCallback(async (task: Task) => {
    if (!task.id) return;
    
    try {
      const priority = await calculateTaskPriority(task);
      await updateTask(task.id, { aiPriority: priority });
      return priority;
    } catch (error) {
      console.error('Error calculating priority:', error);
      return null;
    }
  }, [updateTask]);

  return {
    updateTask,
    deleteTask,
    recalculatePriority,
  };
}