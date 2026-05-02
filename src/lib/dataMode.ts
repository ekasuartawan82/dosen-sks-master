const ENABLE_LOCAL_FALLBACK = import.meta.env.VITE_ENABLE_LOCAL_FALLBACK === 'true';

export const canUseLocalFallback = () => ENABLE_LOCAL_FALLBACK;

export const rethrowInProduction = (error: unknown): void => {
    if (!ENABLE_LOCAL_FALLBACK) {
        throw error instanceof Error ? error : new Error('Supabase request failed');
    }
};
