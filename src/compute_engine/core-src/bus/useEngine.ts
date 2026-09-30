/**
 * METATRON V11 — UNIFIED ENGINE HOOK
 * ===================================
 *
 * One React hook, one mental model. The hook probes for the native daemon
 * on mount; if it answers, it streams real snapshots over WebSocket. If
 * not, it spins up the in-browser fallback at the same ABI. Either way
 * components see the same { capabilities, snapshot } shape.
 */

import { useEffect, useRef, useState } from 'react';
import { EngineBus, type ConnectionState } from './EngineBus';
import { createFallbackEngineAsync, type FallbackEngineHandle } from './FallbackEngine';
import type { EngineCapabilities, FieldSnapshot } from './protocol';

export interface UseEngineResult {
  readonly state: ConnectionState | 'fallback';
  readonly capabilities: EngineCapabilities | null;
  readonly snapshot: FieldSnapshot | null;
  readonly setTargetM: (m: number) => void;
}

export function useEngine(): UseEngineResult {
  const [state, setState] = useState<ConnectionState | 'fallback'>('idle');
  const [caps, setCaps] = useState<EngineCapabilities | null>(null);
  const [snap, setSnap] = useState<FieldSnapshot | null>(null);
  const busRef = useRef<EngineBus | null>(null);
  const fallbackRef = useRef<FallbackEngineHandle | null>(null);

  useEffect(() => {
    let cancelled = false;

    let cleanupFallback: (() => void) | undefined;

    async function startFallback() {
      if (cancelled) return;
      const fb = await createFallbackEngineAsync();
      if (cancelled) return;
      fallbackRef.current = fb;
      setCaps(fb.capabilities());
      setState('fallback');
      const off = fb.onSnapshot(setSnap);
      fb.start(250);
      setSnap(fb.snapshot());
      cleanupFallback = () => { off(); fb.stop(); };
    }
    EngineBus.probe().then((alive) => {
      if (cancelled) return;
      if (!alive) {
        startFallback();
        return;
      }
      const bus = new EngineBus();
      busRef.current = bus;
      bus.on('state', setState);
      bus.on('capabilities', setCaps);
      bus.on('snapshot', setSnap);
      bus.on('error', (e) => console.warn('engine bus', e.message));
      bus.connect();
      bus
        .call('field.subscribe')
        .catch(() => {
          // engine refused subscription — drop to fallback
          bus.destroy();
          startFallback();
        });
    });

    return () => {
      cancelled = true;
      cleanupFallback?.();
      busRef.current?.destroy();
      busRef.current = null;
      fallbackRef.current = null;
    };
  }, []);

  return {
    state,
    capabilities: caps,
    snapshot: snap,
    setTargetM: (m: number) => {
      if (busRef.current && busRef.current.currentState === 'open') {
        busRef.current.call('field.setTargetM', { m }).catch(() => undefined);
      } else {
        fallbackRef.current?.setTargetM(m);
      }
    },
  };
}
