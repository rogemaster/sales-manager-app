export const deleteShoppingSettings = async (ids: string[]): Promise<void> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) throw new Error('쇼핑몰 정보설정 삭제 실패');
};
