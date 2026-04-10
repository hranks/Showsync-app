'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { LayoutDashboard, CalendarDays, Banknote, FileText, Settings } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

export function SidebarNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const links = [
    {
      name: t('sidebar.dashboard'),
      href: '/',
      icon: LayoutDashboard,
    },
    {
      name: t('sidebar.events'),
      href: '/events',
      icon: CalendarDays,
    },
    {
      name: t('sidebar.earnings'),
      href: '/earnings',
      icon: Banknote,
    },
    {
      name: t('sidebar.reports'),
      href: '/reports',
      icon: FileText,
    },
    {
      name: t('sidebar.settings'),
      href: '/settings',
      icon: Settings,
    },
  ];

  return (
    <nav className="flex flex-col p-2 space-y-1">
      {links.map((link) => (
        <Link
          key={link.name}
          href={link.href}
          className={cn(
            buttonVariants({
              variant: pathname === link.href ? 'default' : 'ghost',
              size: 'default',
            }),
            'justify-start'
          )}
        >
          <link.icon className="mr-2 h-4 w-4" />
          {link.name}
        </Link>
      ))}
    </nav>
  );
}
