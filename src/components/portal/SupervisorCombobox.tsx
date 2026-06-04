import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface Props {
  value: string;
  onChange: (v: string) => void;
  employees: { id: string; name: string }[];
  excludeId?: string;
  id?: string;
  placeholder?: string;
}

export default function SupervisorCombobox({ value, onChange, employees, excludeId, id, placeholder = "Select supervisor…" }: Props) {
  const [open, setOpen] = useState(false);
  const options = useMemo(
    () => employees.filter((e) => e.id !== excludeId).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [employees, excludeId]
  );
  const matchesExisting = options.some((o) => o.name === value);
  const displayValue = value || "No supervisor";

  return (
    <div className="relative mt-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            className="w-full inline-flex items-center justify-between px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <span className={cn("truncate text-left", !value && "text-muted-foreground")}>
              {displayValue}
              {value && !matchesExisting && (
                <span className="ml-2 text-xs text-muted-foreground">(custom)</span>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
          <Command>
            <CommandInput placeholder="Search employees…" />
            <CommandList>
              <CommandEmpty>No employees found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === "" ? "opacity-100" : "opacity-0")} />
                  <span className="text-muted-foreground">No supervisor</span>
                </CommandItem>
                {options.map((emp) => (
                  <CommandItem
                    key={emp.id}
                    value={emp.name}
                    onSelect={() => {
                      onChange(emp.name);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === emp.name ? "opacity-100" : "opacity-0")} />
                    {emp.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear supervisor"
          className="absolute right-8 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
