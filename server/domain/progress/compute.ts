/**
 * Cálculo unificado de progresso de Key Results.
 *
 * Antes existiam três implementações divergentes (key-result.repo, recalc,
 * kr-check-ins.routes) com regras de clamp e arredondamento diferentes.
 * Esta é a função canônica — qualquer caminho que precisar do progresso de
 * um KR a partir de currentValue/targetValue deve usar esta função.
 */

import { convertBRToDatabase } from "../../shared/formatters";

/** Clamp interno permite até 999.99% (KRs que superam a meta). UI deve cortar em 100%. */
const MAX_PROGRESS = 999.99;

/**
 * Calcula o progresso percentual de um KR a partir do valor atual e da meta.
 * Aceita strings em formato BR (vírgula) ou EN (ponto), ou números.
 *
 * @returns número entre 0 e 999.99 (com 2 casas decimais).
 */
export function computeKrProgress(
  currentValue: string | number | null | undefined,
  targetValue: string | number | null | undefined
): number {
  const current = toNumber(currentValue);
  const target = toNumber(targetValue);
  if (target <= 0) return 0;
  const raw = (current / target) * 100;
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(raw, MAX_PROGRESS));
}

/** Mesma regra do compute, mas retornando string formatada para gravar no banco. */
export function computeKrProgressForDb(
  currentValue: string | number | null | undefined,
  targetValue: string | number | null | undefined
): string {
  return computeKrProgress(currentValue, targetValue).toFixed(2);
}

function toNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  return convertBRToDatabase(v);
}
