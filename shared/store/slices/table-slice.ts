import { TableData } from '@/entities/table/model/types';
import {
  buildTableCellEvent,
  buildTableRowEvent,
} from '@/entities/points/lib/calculate-points';
import { tryEarnPoints } from '@/entities/points/lib/process-point-event';
import { StateCreator } from 'zustand';
import type { AppStore } from '../store-config';

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

export const createTablesSlice: StateCreator<AppStore, [], [], TablesSlice> = (set, get) => ({
    tables: initialTables,
    addTable: (table) =>
        set((state) => ({
            tables: [...state.tables, { ...table, id: Date.now().toString(), rows: [] }],
        })),

    addTableRow: (tableId) => {
        const table = get().tables.find((item) => item.id === tableId);
        if (!table) return;

        const rowId = `${Date.now()}`;
        set((state) => ({
            tables: state.tables.map((t) =>
                t.id === tableId
                    ? {
                        ...t,
                        rows: [
                            ...t.rows,
                            {
                                ...Object.fromEntries(t.columns.map((col) => [col, ''])),
                                id: rowId,
                            },
                        ],
                    }
                    : t
            ),
        }));

        tryEarnPoints(get, buildTableRowEvent(tableId, rowId));
    },

    updateTableCell: (tableId, rowId, column, value) => {
        if (!value.trim()) {
            set((state) => ({
                tables: state.tables.map((t) =>
                    t.id === tableId
                        ? {
                            ...t,
                            rows: t.rows.map((r) => (r.id === rowId ? { ...r, [column]: value } : r)),
                        }
                        : t
                ),
            }));
            return;
        }

        set((state) => ({
            tables: state.tables.map((t) =>
                t.id === tableId
                    ? {
                        ...t,
                        rows: t.rows.map((r) => (r.id === rowId ? { ...r, [column]: value } : r)),
                    }
                    : t
            ),
        }));

        const today = new Date().toISOString().split('T')[0];
        tryEarnPoints(get, buildTableCellEvent(tableId, rowId, today));
    },

    deleteTableRow: (tableId, rowId) =>
        set((state) => ({
            tables: state.tables.map((t) =>
                t.id === tableId ? { ...t, rows: t.rows.filter((r) => r.id !== rowId) } : t
            ),
        })),

});