import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function FilterDropdown({
  name,
  value,
  options,
  onChange,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectOption = (optionValue) => {
    onChange({
      target: {
        name,
        value: optionValue,
      },
    });

    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-lg border border-emerald-300/40 bg-slate-950 px-4 py-3 text-left text-sm font-semibold text-white outline-none transition hover:border-emerald-300 focus:border-emerald-300"
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-lg border border-emerald-300/30 bg-slate-950 py-2 shadow-2xl shadow-black/50">
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => selectOption(option.value)}
                className={`block w-full px-4 py-2.5 text-left text-sm font-semibold transition ${
                  isSelected
                    ? 'bg-emerald-300 text-slate-950'
                    : 'text-white hover:bg-emerald-300/15'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}