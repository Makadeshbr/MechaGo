// Barramento de eventos de autenticação — desacopla o interceptor HTTP (api.ts)
// do React navigation tree. O api.ts emite "forceLogout" e o _layout.tsx escuta,
// evitando chamar router.replace() fora do React lifecycle.
type Listener = () => void;

class AuthEventBus {
  private listeners: Listener[] = [];

  onForceLogout(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emitForceLogout(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const authEvents = new AuthEventBus();
