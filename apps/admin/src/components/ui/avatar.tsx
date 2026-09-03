import { Avatar as RadixAvatar } from 'radix-ui';
import { cn } from '@/lib/cn';

export const Avatar = ({ name, className }: { name: string; className?: string }) => {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <RadixAvatar.Root className={cn('flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft ring-1 ring-inset ring-accent/15', className)}>
      <RadixAvatar.Fallback className="text-body-sm font-bold text-accent-hover">{initials}</RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
};
