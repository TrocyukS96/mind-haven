'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { JournalEntry } from '@/entities/journal/model/types';
import { Goal } from '@/entities/goal/model/types';
import { Habit } from '@/entities/habit/model/types';
import { TableData } from '@/entities/table/model/types';

interface AppStore {
  // Journal
  journalEntries: JournalEntry[];
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'date'>) => void;
  
  // Goals
  goals: Goal[];
  addGoal: (goal: Omit<Goal, 'id' | 'progress'>) => void;
  updateGoalProgress: (id: string, progress: number) => void;
  
  // Habits
  habits: Habit[];
  addHabit: (habit: Omit<Habit, 'id' | 'streak' | 'completedDays'>) => void;
  toggleHabitDay: (id: string, date: string) => void;
  
  // Tables
  tables: TableData[];
  addTable: (table: Omit<TableData, 'id' | 'rows'>) => void;
  addTableRow: (tableId: string) => void;
  updateTableCell: (tableId: string, rowId: string, column: string, value: string) => void;
  deleteTableRow: (tableId: string, rowId: string) => void;
}

const StoreContext = createContext<AppStore | undefined>(undefined);

const initialJournalEntries: JournalEntry[] = [
  {
    id: '1',
    title: 'Размышления о продуктивности',
    content: 'Сегодня я осознал, что самое важное — это не количество часов работы, а качество фокуса...',
    date: '2025-11-19',
  },
  {
    id: '2',
    title: 'Благодарность',
    content: 'Три вещи, за которые я благодарен сегодня: здоровье, поддержку близких и возможность учиться...',
    date: '2025-11-18',
  },
];

const initialGoals: Goal[] = [
  {
    id: '1',
    title: 'Прочитать 12 книг',
    description: 'Читать минимум 1 книгу в месяц для расширения кругозора',
    progress: 40,
    deadline: '2025-12-31',
    category: 'year',
  },
  {
    id: '2',
    title: 'Запустить свой проект',
    description: 'Разработать и запустить веб-приложение для саморазвития',
    progress: 65,
    deadline: '2025-12-15',
    category: 'month',
  },
];

const initialHabits: Habit[] = [
  {
    id: '1',
    name: 'Медитация',
    frequency: 'Ежедневно',
    streak: 7,
    completedDays: ['2025-11-19', '2025-11-18', '2025-11-17', '2025-11-16'],
  },
  {
    id: '2',
    name: 'Чтение книг',
    frequency: 'Ежедневно',
    streak: 12,
    completedDays: ['2025-11-19', '2025-11-18', '2025-11-17'],
  },
];

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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(initialJournalEntries);
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [tables, setTables] = useState<TableData[]>(initialTables);

  const addJournalEntry = (entry: Omit<JournalEntry, 'id' | 'date'>) => {
    const newEntry: JournalEntry = {
      ...entry,
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
    };
    setJournalEntries([newEntry, ...journalEntries]);
  };

  const addGoal = (goal: Omit<Goal, 'id' | 'progress'>) => {
    const newGoal: Goal = {
      ...goal,
      id: Date.now().toString(),
      progress: 0,
    };
    setGoals([...goals, newGoal]);
  };

  const updateGoalProgress = (id: string, progress: number) => {
    setGoals(goals.map(g => g.id === id ? { ...g, progress } : g));
  };

  const addHabit = (habit: Omit<Habit, 'id' | 'streak' | 'completedDays'>) => {
    const newHabit: Habit = {
      ...habit,
      id: Date.now().toString(),
      streak: 0,
      completedDays: [],
    };
    setHabits([...habits, newHabit]);
  };

  const toggleHabitDay = (id: string, date: string) => {
    setHabits(habits.map(habit => {
      if (habit.id === id) {
        const isCompleted = habit.completedDays.includes(date);
        const completedDays = isCompleted
          ? habit.completedDays.filter(d => d !== date)
          : [...habit.completedDays, date];
        return {
          ...habit,
          completedDays,
          streak: isCompleted ? Math.max(0, habit.streak - 1) : habit.streak + 1,
        };
      }
      return habit;
    }));
  };

  const addTable = (table: Omit<TableData, 'id' | 'rows'>) => {
    const newTable: TableData = {
      ...table,
      id: Date.now().toString(),
      rows: [],
    };
    setTables([...tables, newTable]);
  };

  const addTableRow = (tableId: string) => {
    setTables(tables.map(table => {
      if (table.id === tableId) {
        const newRow: { [key: string]: string } = { id: Date.now().toString() };
        table.columns.forEach(col => {
          newRow[col] = '';
        });
        return { ...table, rows: [...table.rows, newRow] };
      }
      return table;
    }));
  };

  const updateTableCell = (tableId: string, rowId: string, column: string, value: string) => {
    setTables(tables.map(table => {
      if (table.id === tableId) {
        return {
          ...table,
          rows: table.rows.map(row => {
            if (row.id === rowId) {
              return { ...row, [column]: value };
            }
            return row;
          }),
        };
      }
      return table;
    }));
  };

  const deleteTableRow = (tableId: string, rowId: string) => {
    setTables(tables.map(table => {
      if (table.id === tableId) {
        return { ...table, rows: table.rows.filter(row => row.id !== rowId) };
      }
      return table;
    }));
  };

  const value: AppStore = {
    journalEntries,
    addJournalEntry,
    goals,
    addGoal,
    updateGoalProgress,
    habits,
    addHabit,
    toggleHabitDay,
    tables,
    addTable,
    addTableRow,
    updateTableCell,
    deleteTableRow,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
