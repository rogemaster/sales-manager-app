import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { useAlert } from '@/hooks/useAlert';
import { getErrorMessage } from '@/shared/utils/errorMessage';
import { RunCollectionBody } from '../types/collection.types';
import { selectedAccountIdsAtom } from '../store/collect.store';
import { buildCollectionResultAlert } from '../util/collectionResultAlert';
import { pendingCollectionAccountIds } from '../util/collectionPending';
import { runOrderCollection } from './runOrderCollection';
import { COLLECTION_ACCOUNTS_QUERY_KEY } from './useGetCollectionAccounts';
import { ORDER_LIST_QUERY_KEY } from './useGetOrders';

const RUN_ORDER_COLLECTION_MUTATION_KEY = ['runOrderCollection'];

/**
 * 결과 알림·선택 해제·무효화를 훅 단위 콜백에 둔다 — mutate() 호출 단위 콜백은 수집 중 다른 화면으로 가면 실행되지 않는다.
 * AlertProvider가 최상위 레이아웃에 있어 다른 화면에서도 결과 알림이 뜬다.
 */
export const useRunOrderCollection = () => {
  const queryClient = useQueryClient();
  const setSelectedAccountIds = useSetAtom(selectedAccountIdsAtom);
  const { showAlert } = useAlert();

  return useMutation({
    mutationKey: RUN_ORDER_COLLECTION_MUTATION_KEY,
    mutationFn: (body: RunCollectionBody) => runOrderCollection(body),
    onSuccess: ({ results }) => {
      setSelectedAccountIds([]);
      showAlert(buildCollectionResultAlert(results));
    },
    onError: (error) => {
      showAlert({ message: getErrorMessage(error, '주문수집 실행 중 오류가 발생했습니다.'), type: 'error' });
    },
    // 수집으로 주문이 늘어나므로 주문 목록·홈 주문 통계도 함께 무효화한다.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [COLLECTION_ACCOUNTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ORDER_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['home', 'order-stats'] });
    },
  });
};

/** 지금 수집 중인 계정 ID. 화면을 다시 열어도 mutation 캐시에서 얻으므로 "수집중"이 고착되거나 중복 실행되지 않는다. */
export const useCollectingAccountIds = (): string[] => {
  const variables = useMutationState({
    filters: { mutationKey: RUN_ORDER_COLLECTION_MUTATION_KEY, status: 'pending' },
    select: (mutation) => mutation.state.variables as RunCollectionBody | undefined,
  });
  return pendingCollectionAccountIds(variables);
};
