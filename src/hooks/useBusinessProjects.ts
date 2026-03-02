import { useQuery } from '@tanstack/react-query';
import { fetchBusinessProjects } from '@/services/businessProjectService';

export function useBusinessProjects() {
  return useQuery({
    queryKey: ['business-projects'],
    queryFn: fetchBusinessProjects,
  });
}
