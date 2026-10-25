import React from 'react';
import {
  TicketStatus,
  TicketCategory,
  TicketPriority,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '@bookleaf/shared';

interface StatusBadgeProps {
  status: TicketStatus | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<string, string> = {
    [TicketStatus.OPEN]: 'bg-amber-100 text-amber-800 border-amber-200',
    [TicketStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800 border-blue-200',
    [TicketStatus.RESOLVED]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    [TicketStatus.CLOSED]: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const label = STATUS_LABELS[status as TicketStatus] || status;
  const style = styles[status] || 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-70"></span>
      {label}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: TicketPriority | string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const styles: Record<string, string> = {
    [TicketPriority.CRITICAL]: 'bg-red-100 text-red-800 border-red-300 font-bold',
    [TicketPriority.HIGH]: 'bg-orange-100 text-orange-800 border-orange-200',
    [TicketPriority.MEDIUM]: 'bg-blue-50 text-blue-700 border-blue-200',
    [TicketPriority.LOW]: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const label = PRIORITY_LABELS[priority as TicketPriority] || priority;
  const style = styles[priority] || 'bg-gray-100 text-gray-600 border-gray-200';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${style}`}>
      {priority === TicketPriority.CRITICAL && <span className="mr-1">⚠️</span>}
      {label}
    </span>
  );
}

interface CategoryBadgeProps {
  category: TicketCategory | string;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const label = CATEGORY_LABELS[category as TicketCategory] || category;

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
      {label}
    </span>
  );
}

interface BookStatusBadgeProps {
  status: string;
}

export function BookStatusBadge({ status }: BookStatusBadgeProps) {
  const isLive = status === 'Published & Live';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        isLive
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 mr-1.5 rounded-full ${
          isLive ? 'bg-emerald-500' : 'bg-amber-500'
        }`}
      ></span>
      {status}
    </span>
  );
}
