// src/features/order/api/useTriggerOrderCollection.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { triggerOrderCollection } from './triggerOrderCollection';
import { COLLECTION_JOBS_QUERY_KEY } from './useGetCollectionJobs';

export const useTriggerOrderCollection = () => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (jobIds: string[]) => triggerOrderCollection(jobIds, workspaceOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COLLECTION_JOBS_QUERY_KEY] });
    },
  });
};
