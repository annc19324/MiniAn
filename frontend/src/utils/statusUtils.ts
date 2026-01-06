import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export const getUserStatusText = (isOnline?: boolean, lastSeen?: string | null) => {
    if (isOnline) return 'Đang hoạt động';
    if (!lastSeen) return '';

    return `Hoạt động ${formatDistanceToNow(new Date(lastSeen), { locale: vi, addSuffix: true })}`;
};

export const getUserStatusColor = (isOnline?: boolean) => {
    if (isOnline) return 'text-green-500';
    return 'text-slate-400';
};
