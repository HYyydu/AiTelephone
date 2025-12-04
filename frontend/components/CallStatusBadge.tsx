'use client';

import { Badge } from '@/components/ui/badge';
import { CallStatus } from '@/lib/types';
import { Phone, PhoneCall, PhoneForwarded, CheckCircle, XCircle, Ban } from 'lucide-react';

interface CallStatusBadgeProps {
  status: CallStatus;
}

export function CallStatusBadge({ status }: CallStatusBadgeProps) {
  const statusConfig = {
    queued: {
      label: 'Queued',
      className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
      icon: Phone,
    },
    calling: {
      label: 'Calling',
      className: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
      icon: PhoneForwarded,
    },
    in_progress: {
      label: 'In Progress',
      className: 'bg-green-100 text-green-700 hover:bg-green-100 animate-pulse',
      icon: PhoneCall,
    },
    completed: {
      label: 'Completed',
      className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
      icon: CheckCircle,
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-100 text-red-700 hover:bg-red-100',
      icon: XCircle,
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
      icon: Ban,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

