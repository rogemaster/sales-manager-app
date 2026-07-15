export const deleteShoppingAccounts = async (ids: string[], ownerId: string): Promise<void> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) throw new Error('쇼핑몰 계정 삭제 실패');
};
