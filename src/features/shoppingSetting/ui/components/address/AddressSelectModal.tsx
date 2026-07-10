'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGetAddressBook } from '@/features/shoppingSetting/api/useGetAddressBook';
import { MallAddress } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { ShoppingMalls } from '@/types/common.type';
import { useAlert } from '@/hooks/useAlert';

interface AddressSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  nameColumnLabel: string;
  mallCode: ShoppingMalls;
  mallId: string;
  value: MallAddress | null;
  onApply: (address: MallAddress) => void;
}

export const AddressSelectModal = ({
  open,
  onOpenChange,
  title,
  nameColumnLabel,
  mallCode,
  mallId,
  value,
  onApply,
}: AddressSelectModalProps) => {
  const { data: addresses = [], isLoading } = useGetAddressBook(mallCode, mallId, open);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const { showAlert } = useAlert();

  useEffect(() => {
    if (open) {
      setSelectedCode(value?.code ?? null);
    }
  }, [open, value]);

  const handleApply = () => {
    const selected = addresses.find((address) => address.code === selectedCode);
    if (!selected) {
      showAlert({ message: '주소를 선택해주세요.', type: 'info' });
      return;
    }
    onApply(selected);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">불러오는 중...</div>
        ) : (
          <RadioGroup value={selectedCode ?? ''} onValueChange={setSelectedCode}>
            <Table>
              <TableHeader>
                <TableRow className="h-16 border-b border-border/40 bg-muted/60 hover:bg-muted/30">
                  <TableHead className="w-12 text-center">선택</TableHead>
                  <TableHead className="text-center font-bold uppercase tracking-widest">{nameColumnLabel}</TableHead>
                  <TableHead className="text-center font-bold uppercase tracking-widest">우편번호</TableHead>
                  <TableHead className="text-left font-bold uppercase tracking-widest">주소</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addresses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-sm">
                      등록된 주소가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  addresses.map((address) => (
                    <TableRow
                      key={address.code}
                      className="group h-14 border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <TableCell className="text-center">
                        <RadioGroupItem value={address.code} />
                      </TableCell>
                      <TableCell className="text-center">{address.name}</TableCell>
                      <TableCell className="text-center">{address.zipCode}</TableCell>
                      <TableCell className="text-left">
                        {address.address} {address.addressDetail}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </RadioGroup>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" onClick={handleApply}>
            적용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
