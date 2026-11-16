"use client";

import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PRESET_LABELS,
  formatRangeLabel,
  type PeriodPreset,
} from "@/domain/period";
import { usePeriodFilter } from "@/shared/hooks/use-period-filter";
import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const PRESET_OPTIONS = Object.entries(PRESET_LABELS) as [
  PeriodPreset,
  string,
][];

export function PeriodPicker() {
  const { range, preset, setPreset, setRange, shift } = usePeriodFilter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DayPickerRange | undefined>();

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Período anterior"
        onClick={() => shift(-1)}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </Button>

      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next)
            setDraft({ from: parseISO(range.from), to: parseISO(range.to) });
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-0 gap-2">
            <CalendarRange className="size-4" aria-hidden />
            <span className="truncate">{formatRangeLabel(range)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          className="flex w-auto flex-col gap-3 p-3"
        >
          <Select
            value={preset}
            onValueChange={(value) => {
              setPreset(value as PeriodPreset);
              if (value !== "custom") setOpen(false);
            }}
          >
            <SelectTrigger aria-label="Período" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESET_OPTIONS.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Calendar
            mode="range"
            locale={ptBR}
            selected={draft}
            onSelect={setDraft}
            defaultMonth={draft?.from}
            numberOfMonths={1}
          />
          <Button
            disabled={!draft?.from || !draft?.to}
            onClick={() => {
              if (!draft?.from || !draft?.to) return;
              setRange({
                from: format(draft.from, "yyyy-MM-dd"),
                to: format(draft.to, "yyyy-MM-dd"),
              });
              setOpen(false);
            }}
          >
            Aplicar período
          </Button>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Próximo período"
        onClick={() => shift(1)}
      >
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
