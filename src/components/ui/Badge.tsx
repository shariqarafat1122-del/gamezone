import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'gold' | 'green' | 'red' | 'blue' | 'purple' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
}

const variantClasses = {
  default: 'bg-white/10 text-white border border-white/10',
  gold: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  green: 'bg-green-500/20 text-green-400 border border-green-500/30',
  red: 'bg-red-500/20 text-red-400 border border-red-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  gray: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-xs',
};

export const Badge = ({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) => {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
};
