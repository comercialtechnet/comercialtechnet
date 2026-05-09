import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Múltiplos vínculos (ex.: vários nomes de supervisor) são armazenados em
// um único campo de texto separados por "||". Helpers garantem consistência.
export const BINDING_SEP = '||';

export function parseBindings(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(BINDING_SEP)
    .map(s => s.trim())
    .filter(Boolean);
}

export function joinBindings(values: string[]): string | null {
  const cleaned = Array.from(new Set(values.map(v => v.trim()).filter(Boolean)));
  return cleaned.length ? cleaned.join(BINDING_SEP) : null;
}
