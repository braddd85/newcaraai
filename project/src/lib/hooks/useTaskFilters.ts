import { useState, useCallback, useMemo } from 'react';
import { Task, FilterOption, SortOption } from '../store';
import { DEFAULT_FILTERS } from '../constants';

export function useTaskFilters(tasks: Task[]) {
  const [filters, setFilters] = useState<FilterOption>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortOption>('priority');

  const updateFilter = useCallback((key: keyof FilterOption, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) =>
      (filters.status === 'all' || task.status === filters.status) &&
      (filters.search === '' || 
        task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.description.toLowerCase().includes(filters.search.toLowerCase())) &&
      (filters.dealership === '' || 
        task.dealership?.toLowerCase().includes(filters.dealership.toLowerCase())) &&
      (filters.hasInsurance === null || 
        (filters.hasInsurance ? !!task.insuranceClaim : !task.insuranceClaim)) &&
      ((task.aiPriority || 0) >= filters.minPriority)
    ).sort((a, b) => {
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
  }, [tasks, filters, sortBy]);

  return {
    filters,
    sortBy,
    updateFilter,
    setSortBy,
    filteredTasks,
  };
}