import { ShoppingMalls } from '@/types/common.type';
import { MOCK_MALL_ACCOUNTS, MallAccountEntry } from '../data/MockShoppingMallAccountsData';
import { MallAccount } from '@/shared/types/mallAccount.types';
import { CreateMallAccountBody } from '@/shared/api/createMallAccount';

export const getMockMallAccounts = (mallCode?: string | null): MallAccount[] => {
  const entries = mallCode
    ? Object.entries(MOCK_MALL_ACCOUNTS).filter(([code]) => code === mallCode)
    : Object.entries(MOCK_MALL_ACCOUNTS);

  return entries.flatMap(([code, items]) =>
    items!.map(({ id, mallName, mallId, manager, createdAt, updatedAt }) => ({
      mallCode: code as ShoppingMalls,
      id,
      mallName,
      mallId,
      manager,
      createdAt,
      updatedAt,
    })),
  );
};

export const createMockMallAccount = (body: CreateMallAccountBody): MallAccount => {
  const allEntries = Object.values(MOCK_MALL_ACCOUNTS).flat() as MallAccountEntry[];
  const maxNum = allEntries.reduce((max, entry) => {
    const num = parseInt(entry.id.replace('MGA-', ''), 10);
    return num > max ? num : max;
  }, 0);
  const newId = `MGA-${String(maxNum + 1).padStart(3, '0')}`;
  const now = new Date().toISOString().slice(0, 19);

  const newEntry: MallAccountEntry = {
    id: newId,
    mallName: body.mallName,
    mallId: body.mallId,
    password: body.password,
    manager: body.manager,
    createdAt: now,
    updatedAt: now,
  };

  if (!MOCK_MALL_ACCOUNTS[body.mallCode]) {
    MOCK_MALL_ACCOUNTS[body.mallCode] = [];
  }
  MOCK_MALL_ACCOUNTS[body.mallCode]!.push(newEntry);

  return {
    mallCode: body.mallCode,
    id: newEntry.id,
    mallName: newEntry.mallName,
    mallId: newEntry.mallId,
    manager: newEntry.manager,
    createdAt: newEntry.createdAt,
    updatedAt: newEntry.updatedAt,
  };
};

export const deleteMockMallAccount = (id: string): boolean => {
  for (const mallCode of Object.keys(MOCK_MALL_ACCOUNTS) as ShoppingMalls[]) {
    const entries = MOCK_MALL_ACCOUNTS[mallCode];
    if (!entries) continue;
    const index = entries.findIndex((entry) => entry.id === id);
    if (index !== -1) {
      entries.splice(index, 1);
      return true;
    }
  }
  return false;
};
