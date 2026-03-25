declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
    userId: string;
    userType: string;
  }
}

export {};
