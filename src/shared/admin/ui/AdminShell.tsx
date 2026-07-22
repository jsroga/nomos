import Link from 'next/link'
import { getAdminSections } from '@/shared/admin/plugins/registry'
import { ADMIN_TITLE, ADMIN_SUBTITLE, ADMIN_SOON_LABEL } from '@/shared/admin/constants/admin-nav'

/**
 * Admin dashboard shell (Track A0/A4): a fixed left nav built from the admin
 * plugin registry (`admin-section` plugins) + a scrollable content area.
 * Rendered inside the admin-gated layout, so it never mounts for non-admins.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const sections = getAdminSections()
  return (
    <div className="flex h-full w-full">
      <aside className="flex w-56 shrink-0 flex-col border-r border-black/10 bg-card/30 p-4 dark:border-white/10">
        <div className="mb-6">
          <div className="text-lg font-semibold">{ADMIN_TITLE}</div>
          <div className="text-xs opacity-60">{ADMIN_SUBTITLE}</div>
        </div>
        <nav className="flex flex-col gap-1">
          {sections.map(section =>
            section.ready && section.path ? (
              <Link
                key={section.id}
                href={section.path}
                className="rounded-md px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
              >
                {section.label}
              </Link>
            ) : (
              <span
                key={section.id}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm opacity-40"
              >
                {section.label}
                <span className="text-[10px] uppercase tracking-wide">{ADMIN_SOON_LABEL}</span>
              </span>
            )
          )}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
