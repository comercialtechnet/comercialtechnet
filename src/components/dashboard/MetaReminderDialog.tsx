import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Target, AlertTriangle } from 'lucide-react';
import { supabaseExternal as supabase } from '@/integrations/supabase/external-client';
import { useFilters } from '@/lib/filters-context';
import { generateMonthKey } from '@/lib/monthly-goals';

const DISMISS_KEY = 'technet-meta-reminder-dismissed';

function getDismissedMonth(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

function setDismissedMonth(monthKey: string) {
  try {
    localStorage.setItem(DISMISS_KEY, monthKey);
  } catch {
    // ignore
  }
}

interface MetaReminderDialogProps {
  onFillNow: () => void;
}

export function MetaReminderDialog({ onFillNow }: MetaReminderDialogProps) {
  const [open, setOpen] = useState(false);
  const { monthlyGoals, isLoadingFromDB } = useFilters();

  useEffect(() => {
    if (isLoadingFromDB) return;

    let cancelled = false;

    async function check() {
      try {
        // 1. Check if user is admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('perfil')
          .eq('id', user.id)
          .single();

        if (!profile || profile.perfil !== 'administrador' || cancelled) return;

        // 2. Check if current month's goal is missing
        const now = new Date();
        const currentMonthKey = generateMonthKey(now.getFullYear(), now.getMonth() + 1);
        const currentGoal = monthlyGoals[currentMonthKey];

        const hasGoal = currentGoal &&
          (currentGoal.meta_faturamento > 0 ||
           currentGoal.meta_total_vendas > 0 ||
           currentGoal.meta_vendas_virtua > 0);

        if (hasGoal) return;

        // 3. Check if user already dismissed for this month
        const dismissed = getDismissedMonth();
        if (dismissed === currentMonthKey) return;

        // 4. We are past day 1 of the month — show the reminder
        if (!cancelled) {
          setOpen(true);
        }
      } catch (err) {
        console.warn('Erro ao verificar lembrete de meta:', err);
      }
    }

    check();

    return () => { cancelled = true; };
  }, [monthlyGoals, isLoadingFromDB]);

  const handleDismiss = () => {
    const now = new Date();
    const currentMonthKey = generateMonthKey(now.getFullYear(), now.getMonth() + 1);
    setDismissedMonth(currentMonthKey);
    setOpen(false);
  };

  const handleFillNow = () => {
    setOpen(false);
    onFillNow();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <DialogTitle className="text-foreground text-lg">Lembrete Importante</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-1">
            Ainda permanece pendente o preenchimento da meta desse mês!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2 pt-2">
          <Button variant="outline" onClick={handleDismiss} className="w-full sm:w-auto">
            Me lembre na próxima
          </Button>
          <Button onClick={handleFillNow} className="w-full sm:w-auto gap-2">
            <Target className="h-4 w-4" />
            Preencher agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
