import { HTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'gold' | 'game';
  hover?: boolean;
  children: ReactNode;
}

const variantClasses = {
  default: 'bg-[#16161f] border border-white/5',
  glass: 'glass',
  gold: 'glass-gold',
  game: 'game-card',
};

export const Card = ({ variant = 'default', hover = false, children, className = '', ...props }: CardProps) => {
  return (
    <motion.div
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={`rounded-2xl ${variantClasses[variant]} ${className}`}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
};

export const CardHeader = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`p-4 pb-0 ${className}`}>{children}</div>
);

export const CardContent = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);

export const CardFooter = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`p-4 pt-0 ${className}`}>{children}</div>
);
