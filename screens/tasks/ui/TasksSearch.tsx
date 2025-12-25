'use client';

import { Input } from "@/shared/ui/input";
import { Search, X } from "lucide-react";
import { useState } from "react";

interface TasksSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function TasksSearch({ value, onChange }: TasksSearchProps) {
  const [localValue, setLocalValue] = useState(value);

  return (
    <div className="relative flex-1 max-w-md h-[36px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Поиск задач..."
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          onChange(e.target.value);
        }}
        className="pl-10 pr-10"
      />
      {localValue && (
        <button
          onClick={() => {
            setLocalValue('');
            onChange('');
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}