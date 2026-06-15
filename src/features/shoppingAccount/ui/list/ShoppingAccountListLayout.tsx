'use client';

import { ShoppingAccountListHeaderSection } from './ShoppingAccountListHeaderSection';
import { ShoppingAccountSearchFilterSection } from './ShoppingAccountSearchFilterSection';
import { ShoppingAccountActionSection } from './ShoppingAccountActionSection';
import { ShoppingAccountTableSection } from './ShoppingAccountTableSection';

export const ShoppingAccountListLayout = () => {
  return (
    <>
      <ShoppingAccountListHeaderSection />
      <ShoppingAccountSearchFilterSection />
      <ShoppingAccountActionSection />
      <ShoppingAccountTableSection />
    </>
  );
};
