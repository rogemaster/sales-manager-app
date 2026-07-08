'use client';

import { ShoppingSettingListHeaderSection } from './ShoppingSettingListHeaderSection';
import { ShoppingSettingSearchFilterSection } from './ShoppingSettingSearchFilterSection';
import { ShoppingSettingActionSection } from './ShoppingSettingActionSection';
import { ShoppingSettingTableSection } from './ShoppingSettingTableSection';
import { NewSettingModal } from './components/NewSettingModal';

export const ShoppingSettingListLayout = () => {
  return (
    <>
      <ShoppingSettingListHeaderSection />
      <ShoppingSettingSearchFilterSection />
      <ShoppingSettingActionSection />
      <ShoppingSettingTableSection />
      <NewSettingModal />
    </>
  );
};
