import { useQuery } from '@tanstack/react-query';
import { getShoppingSetting } from './getShoppingSetting';

export const SHOPPING_SETTING_QUERY_KEY = 'shoppingSetting';

export const useGetShoppingSetting = (id: string) => {
  return useQuery({
    queryKey: [SHOPPING_SETTING_QUERY_KEY, id],
    queryFn: () => getShoppingSetting(id),
    enabled: !!id,
  });
};
