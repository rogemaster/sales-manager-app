export const deleteUsers = async (ids: string[]): Promise<void> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/account/users`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  // 서버가 거절 사유(본인 계정·권한 없는 사용자 포함)를 담아 보낸다. 고정 문구로 덮지 않는다.
  if (!response.ok) {
    const { error } = await response.json().catch(() => ({ error: '' }));
    throw new Error(error || '사용자 삭제 실패');
  }
};
