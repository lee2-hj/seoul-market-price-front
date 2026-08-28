import { useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface AutocompleteInputProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onInvalidBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  requiredSelection?: boolean;
  className?: string;
}

export function AutocompleteInput({
  value,
  options,
  onChange,
  onInvalidBlur,
  placeholder = "자치구를 선택해 주세요",
  disabled,
  requiredSelection = false,
  className,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [filterKeyword, setFilterKeyword] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useId();

  const filteredOptions = useMemo(() => {
    const keyword = filterKeyword.trim().toLowerCase();
    return keyword
      ? options.filter((option) => option.toLowerCase().includes(keyword))
      : options;
  }, [filterKeyword, options]);

  const selectOption = (option: string) => {
    onChange(option);
    setFilterKeyword("");
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const handleToggle = () => {
    if (disabled) return;
    setOpen((isOpen) => !isOpen);
    setFilterKeyword("");
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className="relative min-w-0 flex-1">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
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
            setFilterKeyword("");
            setOpen(true);
            setHighlightedIndex(-1);
          }}
          onChange={(event) => {
            const nextValue = event.target.value;
            setFilterKeyword(nextValue);
            onChange(nextValue);
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
            setFilterKeyword("");
            setHighlightedIndex(-1);
            const isInvalid = !options.includes(value) && (requiredSelection || Boolean(value));
            if (isInvalid) onInvalidBlur?.();
          }}
          className={cn(
            "w-full h-[48px] rounded-[10px] border border-[#DCE8ED] bg-white px-4 pr-11 text-[15px] font-bold text-[#13202B] placeholder:text-[#94A3B8] outline-none transition-colors focus:border-[#0F8AA8] disabled:bg-[#F0F7FA] disabled:cursor-not-allowed cursor-pointer",
            className,
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={open ? "선택 목록 닫기" : "선택 목록 열기"}
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleToggle}
          className="absolute right-2 flex size-8 cursor-pointer items-center justify-center border-0 bg-transparent text-[#64748B] disabled:cursor-not-allowed"
        >
          <ChevronDown
            className={cn(
              "size-4.5 stroke-[2] transition-transform duration-200",
              open && "rotate-180 text-[#0F8AA8]",
            )}
          />
        </button>
      </div>

      {open && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-60 overflow-y-auto rounded-[10px] border border-[#DCE8ED] bg-white p-1.5 shadow-[0_12px_30px_rgba(18,48,71,0.14)]"
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2.5 text-center text-[13px] font-medium text-[#94A3B8]">
              검색 결과가 없습니다
            </div>
          ) : (
            filteredOptions.map((option, index) => {
              const isSelected = option === value;
              return (
                <button
                  key={option}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectOption(option);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    "block w-full cursor-pointer rounded-[7px] border-0 px-3.5 py-2.5 text-left text-[14px] font-bold text-[#13202B] transition-colors hover:bg-[#E8F6F9] hover:text-[#0F8AA8]",
                    (isSelected || index === highlightedIndex) &&
                      "bg-[#E8F6F9] text-[#0F8AA8]",
                  )}
                >
                  {option}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
