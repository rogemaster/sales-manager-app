// src/features/order/api/useTriggerOrderCollection.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { triggerOrderCollection } from './triggerOrderCollection';
import { COLLECTION_JOBS_QUERY_KEY } from './useGetCollectionJobs';

export const useTriggerOrderCollection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobIds: string[]) => triggerOrderCollection(jobIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COLLECTION_JOBS_QUERY_KEY] });
    },
  });
};
