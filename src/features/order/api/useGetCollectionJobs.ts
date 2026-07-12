// src/features/order/api/useGetCollectionJobs.ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { collectSearchParamsAtom } from '../store/collect.store';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getCollectionJobs } from './getCollectionJobs';
import { CollectionJob } from '../types/collection.types';

export const COLLECTION_JOBS_QUERY_KEY = 'collectionJobs';

export const useGetCollectionJobs = () => {
  const searchParams = useAtomValue(collectSearchParamsAtom);
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [COLLECTION_JOBS_QUERY_KEY, workspaceOwnerId, searchParams],
    queryFn: () => getCollectionJobs(workspaceOwnerId, searchParams),
    enabled: !!workspaceOwnerId,
    refetchInterval: (query) => {
      const jobs: CollectionJob[] = query.state.data ?? [];
      return jobs.some((job) => job.status === 'COLLECTING') ? 2000 : false;
    },
  });
};
