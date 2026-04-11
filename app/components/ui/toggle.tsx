import type { ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/lib/utils';

const toggleVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-1 rounded-sm border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4 data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground',
  {
    variants: {
      variant: {
        default: 'bg-transparent hover:bg-muted hover:text-foreground',
        outline: 'border-border bg-background hover:bg-muted hover:text-foreground data-[state=on]:border-border data-[state=on]:bg-secondary',
      },
      size: {
        default: 'h-8 px-2.5',
        sm: 'h-7 px-2.5 text-[0.8rem]',
        lg: 'h-9 px-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ToggleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> &
  VariantProps<typeof toggleVariants> & {
    pressed?: boolean;
  };

function Toggle({ className, variant, size, pressed = false, ...props }: ToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      data-state={pressed ? 'on' : 'off'}
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
