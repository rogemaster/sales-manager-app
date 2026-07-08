'use client';

import { useAtom } from 'jotai';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { isNewSettingModalOpenAtom } from '@/features/shoppingSetting/store/search.store';
import { useGetAvailableMallAccounts } from '@/features/shoppingSetting/api/useGetAvailableMallAccounts';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { useAlert } from '@/hooks/useAlert';

const getMallName = (code: string) => SHOPPING_MALLS.find((m) => m.code === code)?.name ?? code;

export const NewSettingModal = () => {
  const [open, setOpen] = useAtom(isNewSettingModalOpenAtom);
  const { data: accounts = [], isLoading } = useGetAvailableMallAccounts();
  const { showAlert } = useAlert();

  const handleRegister = () => {
    showAlert({ message: '준비중인 기능입니다.', type: 'info' });
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
              <TableRow>
                <TableHead className="text-center">쇼핑몰</TableHead>
                <TableHead className="text-center">아이디</TableHead>
                <TableHead className="text-center">설정현황</TableHead>
                <TableHead className="text-center">등록</TableHead>
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
                  <TableRow key={account.id}>
                    <TableCell className="text-center">{getMallName(account.mallCode)}</TableCell>
                    <TableCell className="text-center">{account.mallId}</TableCell>
                    <TableCell className="text-center">
                      {account.settingCount > 0 ? `이미 ${account.settingCount}건 설정됨` : '미설정'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" onClick={handleRegister}>
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
