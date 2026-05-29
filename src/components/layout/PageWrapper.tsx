// src/components/layout/PageWrapper.tsx
import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

interface PageWrapperProps {
  children: React.ReactNode
  className?: string
  padding?: boolean
  animate?: boolean
}

const PageWrapper: React.FC<PageWrapperProps> = ({
  children,
  className,
  padding = true,
  animate = true,
}) => {
  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25 }}
        className={cn(padding && 'px-4', className)}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div className={cn(padding && 'px-4', className)}>
      {children}
    </div>
  )
}

export default PageWrapper
