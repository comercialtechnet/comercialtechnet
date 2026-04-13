import { motion } from 'framer-motion';

export function LoadingScreen() {
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
      <motion.p
        className="text-sm text-muted-foreground font-medium"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        Buscando informações na base de dados...
      </motion.p>
    </div>
  );
}
