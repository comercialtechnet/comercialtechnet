import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;
  compValue?: string;
  compTrend?: number | undefined;
  color?: string;
}

export function KPICard({ title, value, subtitle, icon: Icon, trend, compValue, compTrend }: KPICardProps) {
  const hasTrend = compTrend !== undefined && compTrend !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="kpi-card p-3 sm:p-5 min-h-[100px] sm:min-h-[120px] flex flex-col justify-between"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight line-clamp-2">{title}</span>
        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
        </div>
      </div>
      <div className="mt-2">
        <p className="text-lg sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight tabular-nums leading-none break-words">{value}</p>
        <div className="flex flex-col gap-0.5 mt-1.5">
          {subtitle && <span className="text-[10px] sm:text-xs text-muted-foreground">{subtitle}</span>}
          {compValue && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {hasTrend && (
                <span className={`inline-flex items-center text-[10px] sm:text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded-md ${
                  compTrend > 0 ? 'text-success bg-success/10' : compTrend < 0 ? 'text-destructive bg-destructive/10' : 'text-muted-foreground bg-muted'
                }`}>
                  {compTrend > 0 ? '↑' : compTrend < 0 ? '↓' : '–'} {Math.abs(compTrend).toFixed(1)}%
                </span>
              )}
              <span className="text-[10px] sm:text-xs text-muted-foreground tabular-nums truncate">
                vs {compValue}
              </span>
            </div>
          )}
          {trend !== undefined && !compValue && (
            <span className={`text-[10px] sm:text-xs font-medium ${trend >= 0 ? 'text-success' : 'text-destructive'}`}>
              {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
