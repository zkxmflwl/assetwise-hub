import { useQuery } from '@tanstack/react-query';
import { fetchSectorProjects } from '@/services/sectorProjectService';

export function useSectorProjects() {
  return useQuery({
    queryKey: ['sector_projects'],
    queryFn: fetchSectorProjects,
  });
}
