'use client';

import { UserSearchFilterSection } from './UserSearchFilterSection';
import { UserActionSection } from './UserActionSection';
import { UserTableSection } from './UserTableSection';

export const UserManagementLayout = () => {
  return (
    <>
      <UserSearchFilterSection />
      <UserActionSection />
      <UserTableSection />
    </>
  );
};
