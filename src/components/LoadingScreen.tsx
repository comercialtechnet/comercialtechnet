import { motion } from 'framer-motion';
import { useFilters } from '@/lib/filters-context';

export function LoadingScreen() {
  const { loadingProgress } = useFilters();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
      {/* WiFi signal animation */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-24 h-24">
          {/* Bottom dot */}
          <motion.circle
            cx="50" cy="78" r="5"
            className="fill-primary"
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse', delay: 0 }}
          />
          {/* Arc 1 (small) */}
          <motion.path
            d="M 32 62 A 25 25 0 0 1 68 62"
            fill="none"
            className="stroke-primary"
            strokeWidth="5"
            strokeLinecap="round"
            initial={{ opacity: 0.1 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse', delay: 0.2 }}
          />
          {/* Arc 2 (medium) */}
          <motion.path
            d="M 20 48 A 42 42 0 0 1 80 48"
            fill="none"
            className="stroke-primary"
            strokeWidth="5"
            strokeLinecap="round"
            initial={{ opacity: 0.1 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse', delay: 0.4 }}
          />
          {/* Arc 3 (large) */}
          <motion.path
            d="M 8 34 A 60 60 0 0 1 92 34"
            fill="none"
            className="stroke-primary"
            strokeWidth="5"
            strokeLinecap="round"
            initial={{ opacity: 0.1 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse', delay: 0.6 }}
          />
        </svg>
      </div>

      {/* Progress bar */}
      <div className="w-64 space-y-2">
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${loadingProgress.percent}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <div className="flex items-center justify-between">
          <motion.p
            className="text-xs text-muted-foreground font-medium"
            key={loadingProgress.step}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {loadingProgress.step}
          </motion.p>
          <span className="text-xs text-muted-foreground tabular-nums">{loadingProgress.percent}%</span>
        </div>
      </div>
    </div>
  );
}
