'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Plus, Table, Trash2 } from 'lucide-react';
import { useStore } from '@/shared/providers/store-provider';
import { CreateTableForm } from '@/features/table/create-table/ui/create-table-form';

export default function TablesPage() {
  const { tables, addTableRow, updateTableCell, deleteTableRow } = useStore();
  const [selectedTable, setSelectedTable] = useState<string | null>(tables[0]?.id || null);
  const [isCreating, setIsCreating] = useState(false);

  const currentTable = tables.find(t => t.id === selectedTable);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1>Таблицы</h1>
          <p className="text-muted-foreground mt-2">
            Организуй данные с гибкими таблицами
          </p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)}>
          <Plus size={20} />
          Создать таблицу
        </Button>
      </div>

      {/* Create Table Form */}
      {isCreating && (
        <CreateTableForm
          onCancel={() => setIsCreating(false)}
          onSuccess={() => {
            setIsCreating(false);
            // Select the newly created table
            if (tables.length > 0) {
              setSelectedTable(tables[tables.length - 1].id);
            }
          }}
        />
      )}

      {/* Table Tabs */}
      {tables.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {tables.map((table) => (
                <Button
                  key={table.id}
                  variant={selectedTable === table.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTable(table.id)}
                >
                  <Table size={16} />
                  {table.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table Content */}
      {currentTable ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{currentTable.name}</CardTitle>
              <Button onClick={() => addTableRow(currentTable.id)}>
                <Plus size={20} />
                Добавить строку
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-border">
                    {currentTable.columns.map((col, index) => (
                      <th key={index} className="text-left py-3 px-4 font-medium">
                        {col}
                      </th>
                    ))}
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {currentTable.rows.length === 0 ? (
                    <tr>
                      <td colSpan={currentTable.columns.length + 1} className="text-center py-12">
                        <Table size={48} className="mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          Нет данных. Добавь первую строку.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    currentTable.rows.map((row) => (
                      <tr key={row.id} className="border-b border-border hover:bg-muted/50">
                        {currentTable.columns.map((col, index) => (
                          <td key={index} className="py-3 px-4">
                            <Input
                              type="text"
                              value={row[col] || ''}
                              onChange={(e) => updateTableCell(currentTable.id, row.id, col, e.target.value)}
                              className="border-transparent hover:border-border focus:border-primary"
                              placeholder={`Введите ${col.toLowerCase()}`}
                            />
                          </td>
                        ))}
                        <td className="py-3 px-4">
                          <button
                            onClick={() => deleteTableRow(currentTable.id, row.id)}
                            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Table size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="mb-2">Нет таблиц</h3>
              <p className="text-muted-foreground mb-4">
                Создай свою первую таблицу для организации данных
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus size={20} />
                Создать таблицу
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
