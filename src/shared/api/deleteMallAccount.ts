export const deleteMallAccount = async (id: string): Promise<void> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mall-accounts/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('쇼핑몰 계정 삭제 실패');
};
