import { useEffect, useRef, useState } from 'react';
import { CLOUD_SYNC_EVENT } from '../db/supabaseClient';

export function useCloudSync(onSync: (changedKeys: string[]) => void): void {
  const callbackRef = useRef(onSync);
  callbackRef.current = onSync;

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ changedKeys?: string[] }>;
      callbackRef.current(custom?.detail?.changedKeys || []);
    };
    window.addEventListener(CLOUD_SYNC_EVENT, handler);
    return () => {
      window.removeEventListener(CLOUD_SYNC_EVENT, handler);
    };
  }, []);
}

export function useCloudSyncTick(): number {
  const [tick, setTick] = useState(0);
  useCloudSync(() => {
    setTick((t) => t + 1);
  });
  return tick;
}
