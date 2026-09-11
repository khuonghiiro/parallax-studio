import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { Command, Project } from '../shared/model';

export function useStudio() {
  const [project, setProject] = useState<Project | null>(null), [connected, setConnected] = useState(false), [error, setError] = useState(''), [ffmpeg, setFfmpeg] = useState(false), [busy, setBusy] = useState(false), [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const current = useRef<Project | null>(null), pending = useRef(0), queue = useRef<Promise<unknown>>(Promise.resolve());
  const accept = useCallback((p: Project) => { if (!current.current || p.revision >= current.current.revision) { current.current = p; setProject(p); } }, []);
  const connect = useCallback(async () => { try { const session = await api.connect(); setFfmpeg(session.ffmpeg); current.current = null; accept(await api.project()); setConnected(true); setError(''); } catch (e) { setConnected(false); setError(e instanceof Error ? e.message : String(e)); } }, [accept]);
  useEffect(() => { void connect(); let active = true, checking = false; const timer = setInterval(async () => { if (checking || pending.current || !active) return; checking = true; try { const v = await api.version(); if (active) { setHistory({ canUndo: v.canUndo, canRedo: v.canRedo }); if (v.revision !== current.current?.revision) accept(await api.project()); setConnected(true); } } catch { if (active) setConnected(false); } finally { checking = false; } }, 1200); return () => { active = false; clearInterval(timer); }; }, [accept, connect]);
  const execute = useCallback((command: Command): Promise<Project> => {
    pending.current++; setBusy(true);
    const next = queue.current.catch(() => { }).then(async () => { try { const p = await api.command(command, current.current?.revision); accept(p); return p; } catch (e) { const message = e instanceof Error ? e.message : String(e); setError(message); if (message.includes('CONFLICT')) accept(await api.project()); throw e; } finally { pending.current--; setBusy(pending.current > 0); } });
    queue.current = next; return next;
  }, [accept]);
  return { project, connected, error, setError, ffmpeg, busy, history, execute, connect, current };
}
