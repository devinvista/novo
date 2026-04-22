import { format as fnsFormat, parseISO as fnsParseISO, type Locale } from "date-fns";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";

export const APP_TZ = "America/Sao_Paulo";

/**
 * Formata uma data no fuso America/Sao_Paulo.
 * Aceita Date, string ISO ou string "YYYY-MM-DD".
 */
export function formatSP(
  date: Date | string | number | null | undefined,
  fmt: string,
  options?: { locale?: Locale }
): string {
  if (date === null || date === undefined || date === "") return "";
  const d = typeof date === "string" ? parseISOSP(date) : new Date(date);
  if (isNaN(d.getTime())) return "";
  return formatInTimeZone(d, APP_TZ, fmt, options);
}

/**
 * Faz parse de string ISO ou "YYYY-MM-DD" assumindo o horário de São Paulo.
 * Retorna um Date que, ao ser formatado em SP, exibe a data correta.
 */
export function parseISOSP(value: string): Date {
  if (!value) return new Date(NaN);
  // String "YYYY-MM-DD" → meia-noite no fuso de São Paulo
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fromZonedTime(`${value}T00:00:00`, APP_TZ);
  }
  return fnsParseISO(value);
}

/**
 * Converte Date (qualquer fuso) em Date "ajustado" para o fuso de São Paulo,
 * útil para cálculos de calendário (start/end of day, diff em dias, etc).
 */
export function toSPZoned(date: Date | string | number): Date {
  const d = typeof date === "string" ? parseISOSP(date) : new Date(date);
  return toZonedTime(d, APP_TZ);
}

/** "Hoje" no fuso de São Paulo. */
export function nowSP(): Date {
  return toZonedTime(new Date(), APP_TZ);
}

/** Reexporta para conveniência. */
export const formatLocal = fnsFormat;
