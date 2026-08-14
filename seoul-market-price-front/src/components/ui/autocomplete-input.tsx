import { useId, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

interface AutocompleteInputProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onInvalidBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AutocompleteInput({
  value,
  options,
  onChange,
  onInvalidBlur,
  placeholder,
  disabled,
  className,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listboxId = useId();
  const filteredOptions = useMemo(() => {
    const keyword = value.trim().toLowerCase();
    return keyword
      ? options.filter((option) => option.toLowerCase().includes(keyword))
      : options;
  }, [options, value]);

  const selectOption = (option: string) => {
    onChange(option);
    setOpen(false);
    setHighlightedIndex(-1);
  };

  return (
    <div className="relative min-w-0 flex-1">
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          open && highlightedIndex >= 0
            ? `${listboxId}-option-${highlightedIndex}`
            : undefined
        }
        onFocus={() => {
          setOpen(true);
          setHighlightedIndex(-1);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setHighlightedIndex(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setHighlightedIndex((index) =>
              filteredOptions.length === 0 ? -1 : (index + 1) % filteredOptions.length,
            );
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setHighlightedIndex((index) =>
              filteredOptions.length === 0
                ? -1
                : index <= 0
                  ? filteredOptions.length - 1
                  : index - 1,
            );
          } else if (event.key === "Enter" && open && highlightedIndex >= 0) {
            const option = filteredOptions[highlightedIndex];
            if (option) {
              event.preventDefault();
              selectOption(option);
            }
          } else if (event.key === "Escape") {
            setOpen(false);
            setHighlightedIndex(-1);
          }
        }}
        onBlur={() => {
          setOpen(false);
          setHighlightedIndex(-1);
          if (value && !options.includes(value)) onInvalidBlur?.();
        }}
        className={cn("w-full", className)}
      />
      {open && !disabled && filteredOptions.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-56 overflow-y-auto rounded-[10px] border border-[#DCE8ED] bg-white p-1.5 shadow-[0_12px_30px_rgba(18,48,71,0.16)]"
        >
          {filteredOptions.map((option, index) => (
            <button
              key={option}
              id={`${listboxId}-option-${index}`}
              type="button"
              role="option"
              aria-selected={option === value}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => selectOption(option)}
              className={cn(
                "block w-full rounded-[7px] border-0 bg-white px-3 py-2 text-left text-[13px] font-semibold text-[#13202B] hover:bg-[#E8F6F9] hover:text-[#0F8AA8]",
                (option === value || index === highlightedIndex) &&
                  "bg-[#E8F6F9] text-[#0F8AA8]",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
