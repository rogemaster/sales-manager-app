export const updateShoppingSettingsStatus = async (ids: string[], isActive: boolean): Promise<void> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, isActive }),
  });
  if (!response.ok) throw new Error('사용여부 변경 실패');
};
