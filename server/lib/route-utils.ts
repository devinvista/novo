import { z } from "zod";

/**
 * Converte um parâmetro de query string para número inteiro.
 * Retorna undefined se o valor for ausente ou não for um inteiro válido.
 */
export function intParam(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? undefined : n;
}

/**
 * Schema Zod para paginação — reutilizável em todos os endpoints de lista.
 */
export const paginationSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? Math.min(Math.max(parseInt(v, 10) || 20, 1), 200) : 20)),
  offset: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? Math.max(parseInt(v, 10) || 0, 0) : 0)),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;
