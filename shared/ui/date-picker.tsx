"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/shared/ui/button"
import { Calendar } from "@/shared/ui/calendar"
import { Label } from "@/shared/ui/label"
import { Popover, PopoverTrigger, PopoverContent } from "./popover"
import { useEffect } from "react"
import { ru } from "date-fns/locale"

interface Props {
  value: string;
  label?: string;
  id: string;
  onChange: (date: string) => void;
}

export function DatePicker({ value, label, id, onChange }: Props) {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(value ? new Date(value) : undefined)

  useEffect(() => {
    if (value) {
      setDate(new Date(value))
    }
  }, [value])

  return (
    <div className="flex flex-col gap-3">
        {label && (
          <Label htmlFor={id} className="px-1">
            {label}
          </Label>
        )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id={id}
            className="w-48 justify-between font-normal"
          >
            {date ? date.toLocaleDateString() : "Выберите дату"}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            locale={ru}
            selected={date ? new Date(date) : undefined}
            captionLayout="dropdown"
            onSelect={(valueDate: Date | undefined) => {
              if (valueDate) {
                setDate(valueDate)
                onChange(valueDate.toISOString())
              }
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
