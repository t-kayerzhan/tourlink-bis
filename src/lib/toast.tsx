import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
type T = { id: number; kind: 'ok' | 'err'; text: string };
const Ctx = createContext<{ ok: (s: string) => void; err: (s: string) => void }>({ ok: () => {}, err: () => {} });
export const useToast = () => useContext(Ctx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const push = useCallback((kind: T['kind'], text: string) => {
    const id = Date.now() + Math.random(); setItems((i) => [...i, { id, kind, text }]);
    setTimeout(() => setItems((i) => i.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <Ctx.Provider value={{ ok: (s) => push('ok', s), err: (s) => push('err', s) }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[3000] flex flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => (<div key={t.id} className={`rounded-xl px-4 py-3 text-sm shadow-soft text-white ${t.kind === 'ok' ? 'bg-forest' : 'bg-terra'}`}>{t.text}</div>))}
      </div>
    </Ctx.Provider>
  );
}
