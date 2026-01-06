import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export const getUserStatusText = (isOnline?: boolean, lastSeen?: string | null) => {
    if (isOnline) return 'Đang hoạt động';
    if (!lastSeen) return '';

    const date = new Date(lastSeen);
    const now = new Date();
    // Cap future dates to now to prevent "in X hours" (time skew fix)
    const effectiveDate = date > now ? now : date;

    return `Hoạt động ${formatDistanceToNow(effectiveDate, { locale: vi, addSuffix: true })}`;
};

export const getUserStatusColor = (isOnline?: boolean) => {
    if (isOnline) return 'text-green-500';
    return 'text-slate-400';
};
