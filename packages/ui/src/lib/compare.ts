export type CellValue = string | number | boolean | null | undefined;

export interface CompareRow {
  key: string;
  label: string;
  values: CellValue[];
}

export interface DiffRow extends CompareRow {
  differs: boolean;
}

const norm = (v: CellValue): string => (v === null || v === undefined ? "" : String(v).trim().toLowerCase());

/** سطرهایی که مقدارشان بین کالاها فرق دارد علامت می‌خورند (خالی با مقدار پر هم تفاوت است). */
export function diffRows(rows: readonly CompareRow[]): DiffRow[] {
  return rows.map((r) => ({ ...r, differs: new Set(r.values.map(norm)).size > 1 }));
}

export const onlyDifferences = (rows: readonly DiffRow[]): DiffRow[] => rows.filter((r) => r.differs);
