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
      className="kpi-card"
    >
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider leading-tight">{title}</span>
        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
          <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </div>
      </div>
      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tighter tabular-nums">{value}</p>
      <div className="flex flex-col gap-0.5 mt-1">
        {subtitle && <span className="text-[10px] sm:text-xs text-muted-foreground">{subtitle}</span>}
        {compValue && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] sm:text-xs text-muted-foreground tabular-nums">
              Ant: {compValue}
            </span>
            {hasTrend && (
              <span className={`text-[10px] sm:text-xs font-semibold tabular-nums ${
                compTrend > 0 ? 'text-success' : compTrend < 0 ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {compTrend > 0 ? '+' : ''}{compTrend.toFixed(1)}%
              </span>
            )}
            {compTrend === undefined && compValue && (
              <span className="text-[10px] sm:text-xs text-muted-foreground">N/A</span>
            )}
          </div>
        )}
        {/* Legacy trend support */}
        {trend !== undefined && !compValue && (
          <span className={`text-[10px] sm:text-xs font-medium ${trend >= 0 ? 'text-success' : 'text-destructive'}`}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>
    </motion.div>
  );
}
