'use client';

import { useAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { isNewSettingModalOpenAtom } from '@/features/shoppingSetting/store/search.store';
import { useGetAvailableMallAccounts } from '@/features/shoppingSetting/api/useGetAvailableMallAccounts';
import { AvailableMallAccount } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';

const getMallName = (code: string) => SHOPPING_MALLS.find((m) => m.code === code)?.name ?? code;

export const NewSettingModal = () => {
  const [open, setOpen] = useAtom(isNewSettingModalOpenAtom);
  const { data: accounts = [], isLoading } = useGetAvailableMallAccounts();
  const router = useRouter();

  const handleRegister = (account: AvailableMallAccount) => {
    setOpen(false);
    router.push(
      `/shopping/settings/create?mallCode=${account.mallCode}&mallId=${encodeURIComponent(account.mallId)}`,
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>쇼핑몰 정보설정 추가</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">불러오는 중...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="h-16 border-b border-border/40 bg-muted/60 hover:bg-muted/30">
                <TableHead className="text-center font-bold uppercase tracking-widest">쇼핑몰</TableHead>
                <TableHead className="text-center font-bold uppercase tracking-widest">아이디</TableHead>
                <TableHead className="text-center font-bold uppercase tracking-widest">설정현황</TableHead>
                <TableHead className="text-center font-bold uppercase tracking-widest">등록</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-sm">
                    등록된 쇼핑몰계정이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow
                    key={account.id}
                    className="group h-14 border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <TableCell className="text-center">{getMallName(account.mallCode)}</TableCell>
                    <TableCell className="text-center">{account.mallId}</TableCell>
                    <TableCell className="text-center">
                      {account.settingCount > 0 ? `이미 ${account.settingCount}건 설정됨` : '미설정'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" onClick={() => handleRegister(account)}>
                        등록
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};
