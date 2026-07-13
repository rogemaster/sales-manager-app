export const isOwnerMatch = (resourceOwnerId: string, requestOwnerId: string | null): boolean =>
  !!requestOwnerId && resourceOwnerId === requestOwnerId;
