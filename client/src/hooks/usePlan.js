import { useQuery, useMutation } from '@tanstack/react-query';
import { getPlanStatus, createCheckout, createPortal } from '../api/billing';

export function usePlan(options = {}) {
  const query = useQuery({
    queryKey: ['plan'],
    queryFn: getPlanStatus,
    staleTime: 0,
    ...options,
  });
  return { ...query, isPremium: query.data?.plan === 'premium' };
}

const redirect = ({ url }) => { window.location.href = url; };

export function useCheckout() {
  return useMutation({ mutationFn: createCheckout, onSuccess: redirect });
}

export function usePortal() {
  return useMutation({ mutationFn: () => createPortal(), onSuccess: redirect });
}

export function useCancelSubscription() {
  return useMutation({ mutationFn: () => createPortal('cancel'), onSuccess: redirect });
}
