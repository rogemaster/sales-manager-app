export const isOwnerMatch = (resourceOwnerId: string, requestOwnerId: string | null): boolean =>
  !!requestOwnerId && resourceOwnerId === requestOwnerId;

export const allOwnedBy = <T extends { id: string; ownerId: string }>(
  ids: string[],
  requestOwnerId: string | null,
  data: T[],
): boolean =>
  ids.every((id) => {
    const item = data.find((d) => d.id === id);
    return !!item && isOwnerMatch(item.ownerId, requestOwnerId);
  });
