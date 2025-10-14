'use client';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">페이지를 불러오는 중...</p>
      </div>
    </div>
  );
}
