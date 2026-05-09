import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Search, X } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

interface MultiSelectFilterProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    className?: string;
    triggerClassName?: string;
}

export function MultiSelectFilter({ label, options, selected, onChange, className, triggerClassName }: MultiSelectFilterProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const isMobile = useIsMobile();
    const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

    useLayoutEffect(() => {
        if (!open || isMobile) return;
        const update = () => {
            const el = triggerRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const dropdownW = 224; // w-56
            const dropdownH = 280; // estimativa: search + lista (max-h-52) + botões
            const left = Math.min(r.left, window.innerWidth - dropdownW - 8);
            const spaceBelow = window.innerHeight - r.bottom;
            const spaceAbove = r.top;
            const openUp = spaceBelow < dropdownH && spaceAbove > spaceBelow;
            const top = openUp
                ? Math.max(8, r.top - dropdownH - 4)
                : Math.min(r.bottom + 4, window.innerHeight - dropdownH - 8);
            setPos({ top, left: Math.max(8, left), width: dropdownW });
        };
        update();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [open, isMobile]);

    useEffect(() => {
        if (isMobile) return; // Drawer manages its own outside-clicks
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                ref.current && !ref.current.contains(target)
            ) {
                setOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isMobile]);

    useEffect(() => {
        if (open && !isMobile && searchRef.current) {
            searchRef.current.focus();
        }
    }, [open, isMobile]);

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

    const TriggerButton = (
        <Button
            variant="outline"
            size="sm"
            className={`h-9 sm:h-8 text-xs justify-between gap-1 w-full font-normal ${selected.length > 0 ? 'border-primary/50 bg-primary/5 text-foreground' : ''} ${triggerClassName || ''}`}
            onClick={() => setOpen(!open)}
        >
            <span className="truncate flex items-center gap-1.5">
                {selected.length > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1 tabular-nums">
                        {selected.length}
                    </span>
                )}
                {selected.length === 0 ? label : selected.length === 1 ? selected[0] : label}
            </span>
            <ChevronDown className={`h-3 w-3 shrink-0 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>
    );

    if (isMobile) {
        return (
            <div className={className}>
                {TriggerButton}
                <Drawer open={open} onOpenChange={setOpen}>
                    <DrawerContent className="max-h-[85vh]">
                        <DrawerHeader className="pb-2">
                            <DrawerTitle className="text-base flex items-center justify-between">
                                <span>{label}</span>
                                {selected.length > 0 && (
                                    <button
                                        onClick={() => onChange([])}
                                        className="text-xs font-normal text-muted-foreground hover:text-foreground"
                                    >
                                        Limpar ({selected.length})
                                    </button>
                                )}
                            </DrawerTitle>
                        </DrawerHeader>
                        <div className="px-4 pb-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    className="w-full h-10 text-sm pl-9 pr-3 rounded-md bg-surface border border-border text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                                    placeholder={`Buscar em ${label.toLowerCase()}...`}
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto px-2 pb-4 max-h-[55vh]">
                            {filteredOptions.length === 0 ? (
                                <p className="text-sm text-muted-foreground px-2 py-8 text-center">Nenhum resultado</p>
                            ) : (
                                filteredOptions.map(opt => {
                                    const checked = selected.includes(opt);
                                    return (
                                        <label
                                            key={opt}
                                            className={`flex items-center gap-3 px-3 py-3 text-sm cursor-pointer rounded-md transition-colors ${checked ? 'bg-primary/10' : 'active:bg-accent'}`}
                                        >
                                            <Checkbox
                                                checked={checked}
                                                onCheckedChange={() => toggle(opt)}
                                                className="h-5 w-5"
                                            />
                                            <span className="flex-1 truncate text-foreground">{opt}</span>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                        <DrawerFooter className="pt-2 border-t border-border">
                            <Button onClick={() => { setOpen(false); setSearch(''); }} className="w-full h-11">
                                Aplicar
                            </Button>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
            </div>
        );
    }

    return (
        <div ref={ref} className={`relative ${className || ''}`}>
            <div ref={triggerRef}>{TriggerButton}</div>
            {open && pos && createPortal(
                <div
                    className="fixed z-[100] bg-popover border border-border rounded-md shadow-lg overflow-hidden"
                    style={{ top: pos.top, left: pos.left, width: pos.width }}
                    onMouseDown={e => e.stopPropagation()}
                >
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
                </div>,
                document.body
            )}
        </div>
    );
}