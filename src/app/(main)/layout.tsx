import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';

export default function MainAppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
