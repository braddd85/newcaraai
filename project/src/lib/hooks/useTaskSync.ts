import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useTaskStore } from '../store';
import { calculateTaskPriority } from '../ai';

export function useTaskSync(userId: string) {
  const { setTasks } = useTaskStore();

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'tasks'),
      where('assignedTo', '==', userId)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const taskData = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();
            if (data.aiPriority === undefined) {
              const priority = await calculateTaskPriority({
                id: doc.id,
                ...data,
              });
              if (priority !== undefined) {
                data.aiPriority = priority;
              }
            }
            return {
              id: doc.id,
              ...data,
            };
          })
        );

        setTasks(taskData.sort((a, b) => (b.aiPriority || 0) - (a.aiPriority || 0)));
      },
      (error) => {
        console.error('Error fetching tasks:', error);
        setTasks([]);
      }
    );

    return () => unsubscribe();
  }, [userId, setTasks]);
}