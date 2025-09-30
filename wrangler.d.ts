import type { GlobalDurableObject } from './worker/core-utils';
declare module 'hono' {
  interface Env {
    Variables: Record<string, unknown>;
    Bindings: {
      GlobalDurableObject: DurableObjectNamespace<GlobalDurableObject>;
      JWT_SECRET: string;
    };
  }
}