import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Search } from 'lucide-react';

interface MultiSelectFilterProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    className?: string;
}

export function MultiSelectFilter({ label, options, selected, onChange, className }: MultiSelectFilterProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (open && searchRef.current) {
            searchRef.current.focus();
        }
    }, [open]);

    const toggle = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter(v => v !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const filteredOptions = search
        ? options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()))
        : options;

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
                <ChevronDown className={`h-3 w-3 shrink-0 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
            </Button>
            {open && (
                <div className="absolute z-50 top-full mt-1 w-56 bg-popover border border-border rounded-md shadow-md overflow-hidden">
                    {/* Search input */}
                    <div className="p-1.5 border-b border-border/50">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <input
                                ref={searchRef}
                                type="text"
                                className="w-full h-7 text-xs pl-7 pr-2 rounded-sm bg-surface border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                                placeholder="Buscar..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onClick={e => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    <div className="p-1 max-h-52 overflow-auto">
                        <button
                            className="w-full text-left text-xs px-2 py-1.5 text-muted-foreground hover:bg-accent rounded-sm"
                            onClick={() => { onChange([]); setSearch(''); }}
                        >
                            Limpar seleção
                        </button>
                        {filteredOptions.length === 0 ? (
                            <p className="text-xs text-muted-foreground px-2 py-3 text-center">Nenhum resultado</p>
                        ) : (
                            filteredOptions.map(opt => (
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
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}