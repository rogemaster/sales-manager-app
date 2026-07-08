'use client';

import { UserManagementHeaderSection } from './UserManagementHeaderSection';
import { UserSearchFilterSection } from './UserSearchFilterSection';
import { UserActionSection } from './UserActionSection';
import { UserTableSection } from './UserTableSection';

export const UserManagementLayout = () => {
  return (
    <div className="space-y-4">
      <UserManagementHeaderSection />
      <UserSearchFilterSection />
      <UserActionSection />
      <UserTableSection />
    </div>
  );
};
