import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown } from 'lucide-react';

interface MultiSelectFilterProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    className?: string;
}

export function MultiSelectFilter({ label, options, selected, onChange, className }: MultiSelectFilterProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggle = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter(v => v !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const displayText = selected.length === 0
        ? label
        : selected.length === 1
            ? selected[0]
            : `${selected.length} selecionados`;

    return (
        <div ref={ref} className={`relative ${className || ''}`}>
            <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs justify-between gap-1 w-full font-normal"
                onClick={() => setOpen(!open)}
            >
                <span className="truncate">{displayText}</span>
                <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
            </Button>
            {open && (
                <div className="absolute z-50 top-full mt-1 w-56 bg-popover border border-border rounded-md shadow-md p-1 max-h-60 overflow-auto">
                    <button
                        className="w-full text-left text-xs px-2 py-1.5 text-muted-foreground hover:bg-accent rounded-sm"
                        onClick={() => { onChange([]); }}
                    >
                        Limpar seleção
                    </button>
                    {options.map(opt => (
                        <label
                            key={opt}
                            className="flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer hover:bg-accent rounded-sm"
                        >
                            <Checkbox
                                checked={selected.includes(opt)}
                                onCheckedChange={() => toggle(opt)}
                                className="h-3.5 w-3.5"
                            />
                            <span className="truncate">{opt}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}