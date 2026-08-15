import { useMutation } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getLinkedProductCount } from './getLinkedProductCount';

/**
 * 조회이지만 useQuery가 아니라 useMutation으로 감싼다.
 * 삭제 버튼을 누른 시점에 한 번만 필요한 명령형 호출이라 선언형 구독으로 둘 이유가 없다.
 */
export const useGetLinkedProductCount = () => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (ids: string[]) => getLinkedProductCount(ids, workspaceOwnerId),
  });
};
