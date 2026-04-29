import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

/**
 * Determina se uma falha de query merece nova tentativa.
 *
 * Não tenta novamente para:
 *  - 4xx (erro do cliente: validação, autorização, recurso inexistente)
 *  - falhas explícitas de aborto (usuário navegou)
 *
 * Tenta novamente até 2 vezes para 5xx e erros de rede transientes.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  const msg = error instanceof Error ? error.message : String(error);
  // Mensagens do throwIfResNotOk começam com "<status>: ..."
  const m = msg.match(/^(\d{3}):/);
  if (m) {
    const status = parseInt(m[1], 10);
    if (status >= 400 && status < 500) return false;
  }
  if (/aborted|cancel/i.test(msg)) return false;
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 5 * 60_000,
      gcTime: 10 * 60_000,
      // Retry com backoff exponencial (1s → 2s → max 8s) apenas para 5xx/rede.
      retry: shouldRetry,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: {
      // Mutations não tentam novamente por padrão para evitar duplicatas (POST/PUT).
      retry: false,
    },
  },
});
