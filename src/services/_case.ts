const camelToSnake = (str: string): string =>
  str.replace(/[A-Z]/g, (m, o) => (o > 0 ? '_' : '') + m.toLowerCase());

const snakeToCamel = (str: string): string =>
  str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

export const toSnake = <T extends Record<string, any>>(obj: T | null | undefined): Record<string, any> => {
  if (!obj) return {};
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj)) {
    const v = (obj as any)[k];
    const sk = camelToSnake(k);
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && v instanceof Date === false) {
      out[sk] = toSnake(v as any);
    } else {
      out[sk] = v;
    }
  }
  return out;
};

export const toCamel = <T>(row: any): T => {
  if (!row || typeof row !== 'object') return row as T;
  if (Array.isArray(row)) return (row as any[]).map((r) => toCamel<any>(r)) as unknown as T;
  const out: Record<string, any> = {};
  for (const k of Object.keys(row)) {
    const v = row[k];
    const ck = snakeToCamel(k);
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      out[ck] = toCamel<any>(v);
    } else if (Array.isArray(v) && (v as any[]).length > 0 && typeof (v as any[])[0] === 'object') {
      out[ck] = (v as any[]).map((x) => toCamel<any>(x));
    } else {
      out[ck] = v;
    }
  }
  return out as T;
};

export { camelToSnake, snakeToCamel };
