'use client';
/**
 * Horní lišta VALXON Academy: logo, navigace, přepínač role (vývojové přihlášení)
 * a pro správce tlačítko „+ Přidat dodavatele“.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/hooks/session';

/** Horní navigační lišta. */
export function TopBar() {
  const { role, switchRole, session } = useSession();
  const pathname = usePathname();
  const isAdminArea = pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-30 flex h-[66px] items-center gap-6 border-b-[3px] border-rose bg-dark px-4 text-white md:px-8">
      <Link href="/" className="flex items-center gap-3 whitespace-nowrap" aria-label="VALXON Academy – domů">
        <span className="grid h-[35px] w-[35px] place-items-center bg-rose text-xl font-extrabold [clip-path:polygon(20%_0,100%_0,80%_100%,0_100%)]">V</span>
        <span className="text-lg leading-none font-extrabold tracking-[1px] md:text-xl">
          VALXON
          <small className="mt-1 block text-[9px] tracking-[2px] text-[#c5c5c8]">ACADEMY</small>
        </span>
      </Link>

      <nav className="hidden gap-4 text-xs font-bold md:flex" aria-label="Hlavní navigace">
        <Link href="/" className={`py-2.5 ${!isAdminArea ? 'border-b-2 border-rose text-white' : 'text-[#d6d8dc]'}`}>Dodavatelé</Link>
        {role === 'admin' && (
          <Link href="/admin" className={`py-2.5 ${isAdminArea ? 'border-b-2 border-rose text-white' : 'text-[#d6d8dc]'}`}>Správa obsahu</Link>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-[11px] text-[#c3c6ca] lg:inline" title="Vývojové přihlášení bez hesla – pouze lokální demo, ne produkční ochrana.">
          Zobrazení (vývojový účet):
        </span>
        <div className="flex gap-0.5 rounded-full border border-[#676970] p-[3px]" role="group" aria-label="Přepnout roli">
          {(['student', 'admin'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => void switchRole(r)}
              aria-pressed={role === r}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${role === r ? 'bg-rose text-white' : 'text-[#c3c6ca]'}`}
            >
              {r === 'student' ? 'Student' : 'Správce'}
            </button>
          ))}
        </div>
        {role === 'admin' && (
          <Link href="/admin/new" className="btn btn-small hidden sm:inline-flex">＋ Přidat dodavatele</Link>
        )}
        <span className="hidden h-[30px] w-[30px] place-items-center rounded-full bg-[#5b5f67] text-xs font-extrabold sm:grid" title={session?.user.name}>
          {role === 'admin' ? 'SP' : 'ST'}
        </span>
      </div>
    </header>
  );
}
