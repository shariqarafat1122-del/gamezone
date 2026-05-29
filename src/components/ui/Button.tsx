import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'ghost' | 'outline' | 'danger' | 'success' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses = {
  gold: 'btn-gold text-black rounded-xl',
  ghost: 'bg-transparent text-white hover:bg-white/5 rounded-xl border border-white/10',
  outline: 'bg-transparent text-yellow-400 border border-yellow-500/50 hover:border-yellow-400 hover:bg-yellow-400/10 rounded-xl',
  danger: 'bg-red-600 hover:bg-red-500 text-white rounded-xl',
  success: 'bg-green-600 hover:bg-green-500 text-white rounded-xl',
  glass: 'glass text-white hover:bg-white/10 rounded-xl',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs font-semibold',
  md: 'px-5 py-2.5 text-sm font-semibold',
  lg: 'px-6 py-3 text-base font-bold',
  xl: 'px-8 py-4 text-lg font-bold',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'gold', size = 'md', isLoading, leftIcon, rightIcon, fullWidth, className = '', children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        className={`
          inline-flex items-center justify-center gap-2 transition-all duration-200
          ${variantClasses[variant]} ${sizeClasses[size]}
          ${fullWidth ? 'w-full' : ''}
          ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
        disabled={disabled || isLoading}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 16} />
        ) : leftIcon ? (
          leftIcon
        ) : null}
        {children}
        {rightIcon && !isLoading && rightIcon}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
