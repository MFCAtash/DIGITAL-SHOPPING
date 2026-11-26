"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cx } from "../lib/cx";
import { moveActive } from "../lib/keys";
import { filterOptions, type Option } from "../lib/text";
import { Icon } from "../icons/Icon";

export interface ComboboxProps {
  label: string;
  options: readonly Option[];
  /** مقدار انتخاب‌شده (value گزینه) یا متن آزاد در حالت allowCustom */
  value: string;
  onValueChange: (value: string) => void;
  /** متن آزاد (مثلاً شهر که در فهرست نیست) را بپذیر */
  allowCustom?: boolean;
  placeholder?: string;
  hint?: string;
  error?: string;
  emptyText?: string;
  required?: boolean;
  hideLabel?: boolean;
  /** آیکون درون ورودی (مثلاً جست‌وجو) */
  leading?: "search";
  name?: string;
  autoComplete?: string;
  className?: string;
  /** با Enter روی متن بدون گزینهٔ فعال (جست‌وجو) */
  onCommit?: (text: string) => void;
  /** هر تغییر متن (برای پیشنهاد از سرور) */
  onInputChange?: (text: string) => void;
}

/**
 * Combobox مطابق الگوی ARIA 1.2: input[role=combobox] + listbox. کیبورد: ↑↓ حرکت، Enter انتخاب، Esc بستن.
 * فیلتر فارسی‌دوست (ی/ک، نیم‌فاصله، ارقام). فهرست پیشنهادها بیرونی هم می‌تواند باشد (options را عوض کنید).
 */
export function Combobox({
  label, options, value, onValueChange, allowCustom = false, placeholder, hint, error, emptyText = "موردی پیدا نشد", required, hideLabel, leading, name, autoComplete = "off", className, onCommit, onInputChange,
}: ComboboxProps) {
  const id = useId();
  const listId = `${id}-list`;
  const selected = options.find((o) => o.value === value);
  const [text, setText] = useState(selected?.label ?? (allowCustom ? value : ""));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // همگام‌سازی وقتی مقدار از بیرون عوض می‌شود
  useEffect(() => {
    const s = options.find((o) => o.value === value);
    setText(s?.label ?? (allowCustom ? value : ""));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => filterOptions(options, selected && text === selected.label ? "" : text), [options, text, selected]);

  const choose = (o: Option) => {
    setText(o.label);
    onValueChange(o.value);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: { key: string; preventDefault(): void }) => {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        if (!open) setOpen(true);
        setActive((a) => moveActive(a, e.key === "ArrowDown" ? 1 : -1, shown.length));
        break;
      }
      case "Enter": {
        const o = shown[active];
        if (open && o) {
          e.preventDefault();
          choose(o);
        } else if (onCommit) {
          e.preventDefault();
          setOpen(false);
          onCommit(text);
        }
        break;
      }
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
          setActive(-1);
        }
        break;
      case "Home":
      case "End":
        break;
    }
  };

  return (
    <div className={cx("cx-field", "cx-combo", className)}>
      <label htmlFor={id} className={cx("cx-field__label", hideLabel && "cx-sr-only")}>
        {label}
        {required ? <span className="cx-field__req" aria-hidden="true"> *</span> : null}
      </label>
      <div className="cx-combo__box">
        {leading === "search" ? <Icon name="search" size={18} className="cx-combo__lead" /> : null}
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && active >= 0 ? `${id}-o${active}` : undefined}
          aria-invalid={!!error || undefined}
          aria-describedby={[hint ? `${id}-hint` : "", error ? `${id}-err` : ""].filter(Boolean).join(" ") || undefined}
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          value={text}
          className={cx("cx-input", leading === "search" && "cx-input--lead")}
          onChange={(e) => {
            const v = e.target.value;
            setText(v);
            setOpen(true);
            setActive(-1);
            onInputChange?.(v);
            if (allowCustom) onValueChange(v);
            else if (selected && v !== selected.label) onValueChange("");
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            setActive(-1);
            // بدون allowCustom متن نامعتبر پاک می‌شود تا مقدار و متن ناهمخوان نماند
            if (!allowCustom && !options.some((o) => o.label === text)) setText(selected?.label ?? "");
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      <ul id={listId} role="listbox" aria-label={label} hidden={!open} className="cx-combo__list">
        {shown.length === 0 ? (
          <li role="presentation" className="cx-combo__empty">{emptyText}</li>
        ) : (
          shown.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-o${i}`}
              role="option"
              aria-selected={o.value === value}
              data-active={i === active || undefined}
              className="cx-combo__option"
              onMouseDown={(e) => e.preventDefault() /* بلور ورودی قبل از کلیک نشود */}
              onClick={() => choose(o)}
            >
              <span>{o.label}</span>
              {o.hint ? <small>{o.hint}</small> : null}
            </li>
          ))
        )}
      </ul>
      {hint ? <p id={`${id}-hint`} className="cx-field__hint">{hint}</p> : null}
      <p id={`${id}-err`} className="cx-field__error" aria-live="polite">
        {error ? (
          <>
            <Icon name="alert" size={16} />
            <span>{error}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}

export interface SearchBoxProps {
  suggestions: readonly Option[];
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: (q: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

/** جست‌وجوی سایت: همان Combobox با آیکون؛ Enter بدون گزینهٔ فعال = جست‌وجوی متن، انتخاب پیشنهاد = جست‌وجوی همان. */
export function SearchBox({ suggestions, query, onQueryChange, onSearch, label = "جست‌وجو در فروشگاه", placeholder = "نام کالا، برند یا مدل", className }: SearchBoxProps) {
  return (
    <div role="search" className={cx("cx-search", className)}>
      <Combobox
        label={label}
        hideLabel
        leading="search"
        options={suggestions}
        value={query}
        allowCustom
        placeholder={placeholder}
        onValueChange={(v) => {
          onQueryChange(v);
          // انتخاب مستقیم یک پیشنهاد: value آن را جست‌وجو کن
          if (suggestions.some((s) => s.value === v)) onSearch(suggestions.find((s) => s.value === v)!.label);
        }}
        onInputChange={onQueryChange}
        onCommit={onSearch}
      />
    </div>
  );
}
