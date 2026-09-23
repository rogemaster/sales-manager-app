import { PermissionGate } from '@/components/common/PermissionGate';
import { ShoppingAccountCreateLayout } from '@/features/shoppingAccount/ui/create/ShoppingAccountCreateLayout';

export default function ShoppingAccountCreatePage() {
  return (
    <PermissionGate permission="shoppingAccount.create" backHref="/shopping/accounts">
      <ShoppingAccountCreateLayout />
    </PermissionGate>
  );
}
