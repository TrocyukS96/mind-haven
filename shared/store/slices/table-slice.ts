// src/store/slices/template.ts
import { TableData } from '@/entities/table/model/types';
import { create, StateCreator } from 'zustand';

const initialTables: TableData[] = [
    {
      id: '1',
      name: 'Финансовый трекер',
      type: 'finance',
      columns: ['Дата', 'Категория', 'Сумма', 'Примечание'],
      rows: [
        { id: '1', 'Дата': '19.11.2025', 'Категория': 'Доход', 'Сумма': '+50000₽', 'Примечание': 'Зарплата' },
        { id: '2', 'Дата': '18.11.2025', 'Категория': 'Расход', 'Сумма': '-1200₽', 'Примечание': 'Продукты' },
      ],
    },
  ];

export interface TablesSlice {
    tables: TableData[];
    addTable: (table: Omit<TableData, 'id' | 'rows'>) => void;
    addTableRow: (tableId: string) => void;
    updateTableCell: (tableId: string, rowId: string, column: string, value: string) => void;
    deleteTableRow: (tableId: string, rowId: string) => void;
}

export const createTablesSlice: StateCreator<TablesSlice> = (set) => ({
    tables: initialTables,
    addTable: (table) =>
        set((state) => ({
            tables: [...state.tables, { ...table, id: Date.now().toString(), rows: [] }],
        })),

    addTableRow: (tableId) =>
        set((state) => ({
            tables: state.tables.map((t) =>
                t.id === tableId
                    ? {
                        ...t,
                        rows: [
                            ...t.rows,
                            Object.fromEntries(t.columns.map((col) => [col, ''])) as any,
                        ].map((row, i) => ({ ...row, id: row.id || Date.now().toString() + i })),
                    }
                    : t
            ),
        })),

    updateTableCell: (tableId, rowId, column, value) =>
        set((state) => ({
            tables: state.tables.map((t) =>
                t.id === tableId
                    ? {
                        ...t,
                        rows: t.rows.map((r) => (r.id === rowId ? { ...r, [column]: value } : r)),
                    }
                    : t
            ),
        })),

    deleteTableRow: (tableId, rowId) =>
        set((state) => ({
            tables: state.tables.map((t) =>
                t.id === tableId ? { ...t, rows: t.rows.filter((r) => r.id !== rowId) } : t
            ),
        })),

});

export const useTablesStore = create<TablesSlice>()(createTablesSlice);