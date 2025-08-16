'use client';

import { MouseEventHandler } from 'react';
import { getPage } from '@/lib/utils';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

type Props = {
  range?: number;
  currentPage: number;
  totalPages: number;
  onChangePage: (page: number) => void;
};

export const TablePagination = ({ range = 10, currentPage, totalPages, onChangePage }: Props) => {
  const pages = getPage(range, currentPage, totalPages);

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
    <Pagination className="mt-14">
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
            className={currentPage === totalPages || pages.length === 1 ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>

        {/* 마지막 */}
        <PaginationItem>
          <PaginationLink
            href="#"
            aria-label="마지막"
            onClick={(e) => handleLastPage(e)}
            className={currentPage === totalPages || pages.length === 1 ? 'pointer-events-none opacity-50' : ''}
          >
            마지막
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
