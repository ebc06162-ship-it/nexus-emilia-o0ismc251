/* Textarea Component - A component that displays a textarea - from shadcn/ui (exposes Textarea) */
import * as React from 'react'

import { cn } from '@/lib/utils'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[96px] w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-[15px] ring-offset-background placeholder:text-muted-foreground placeholder:text-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-[15px]',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Textarea.displayName = 'Textarea'

export { Textarea }
