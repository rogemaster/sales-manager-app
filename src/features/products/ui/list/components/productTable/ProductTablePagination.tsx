'use client';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { MouseEventHandler } from 'react';

type Props = {
  totalPages: number;
  currentPage: number;
  onChangePage: (page: number) => void;
};

export const ProductTablePagination = ({ totalPages, currentPage, onChangePage }: Props) => {
  const maxRange = 10;
  const currentBlock = Math.floor((currentPage - 1) / maxRange);
  const startPage = currentBlock * maxRange + 1;
  const endPage = Math.min(startPage + maxRange - 1, totalPages);
  const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  const handleFirstPage: MouseEventHandler = (e) => {
    e.preventDefault();
    if (currentPage !== 1) {
      onChangePage(1);
    }
  };

  const handlePrevPage: MouseEventHandler = (e) => {
    e.preventDefault();
    if (currentPage > 1) {
      onChangePage(currentPage - 1);
    }
  };

  const handleChangeCurrentPage = (e: React.MouseEvent<HTMLAnchorElement>, page: number) => {
    e.preventDefault();
    onChangePage(page);
  };

  const handleNextPage: MouseEventHandler = (e) => {
    e.preventDefault();
    onChangePage(currentPage + 1);
  };

  const handleLastPage: MouseEventHandler = (e) => {
    e.preventDefault();
    onChangePage(totalPages);
  };

  return (
    <Pagination>
      <PaginationContent>
        {/* 처음 */}
        <PaginationItem>
          <PaginationLink
            href="#"
            aria-label="처음"
            onClick={(e) => handleFirstPage(e)}
            className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
          >
            처음
          </PaginationLink>
        </PaginationItem>

        {/* 이전 */}
        <PaginationItem>
          <PaginationPrevious
            href="#"
            aria-label="이전"
            onClick={(e) => handlePrevPage(e)}
            className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>

        {/* 페이지 번호 + Ellipsis */}
        {pages.map((page) => (
          <PaginationItem key={page}>
            <PaginationLink href="#" onClick={(e) => handleChangeCurrentPage(e, page)} isActive={currentPage === page}>
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}

        {/* 다음 */}
        <PaginationItem>
          <PaginationNext
            href="#"
            aria-label="다음"
            onClick={(e) => handleNextPage(e)}
            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>

        {/* 마지막 */}
        <PaginationItem>
          <PaginationLink
            href="#"
            aria-label="마지막"
            onClick={(e) => handleLastPage(e)}
            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
          >
            마지막
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
