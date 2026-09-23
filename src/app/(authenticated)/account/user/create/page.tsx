import { PermissionGate } from '@/components/common/PermissionGate';
import { UserCreateLayout } from '@/features/account/ui/user/create/UserCreateLayout';

export default function UserCreatePage() {
  return (
    <PermissionGate permission="user.create" backHref="/account/user">
      <UserCreateLayout />
    </PermissionGate>
  );
}
