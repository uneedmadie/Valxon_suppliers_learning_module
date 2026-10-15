/**
 * Minimalistický parser robots.txt. Importér respektuje pravidla `Disallow`/`Allow`
 * pro svůj user-agent nebo `*` (nejdelší shoda vyhrává, Allow při shodě délky) a čte `Sitemap:`.
 */

/** Pravidla robots.txt relevantní pro náš crawler. */
export interface RobotsRules {
  allow: string[];
  disallow: string[];
  sitemaps: string[];
  crawlDelaySeconds: number | null;
}

/** Prázdná pravidla – použijí se, když robots.txt neexistuje (404). */
export const EMPTY_ROBOTS: RobotsRules = { allow: [], disallow: [], sitemaps: [], crawlDelaySeconds: null };

/**
 * Rozparsuje robots.txt pro daný user-agent token.
 * Pokud existuje skupina přímo pro náš token, má přednost před `*`.
 */
export function parseRobots(text: string, agentToken: string): RobotsRules {
  const groups: { agents: string[]; allow: string[]; disallow: string[]; delay: number | null }[] = [];
  const sitemaps: string[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    // Po sobě jdoucí řádky User-agent tvoří jednu skupinu.
    if (field === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], allow: [], disallow: [], delay: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (field === 'sitemap') {
      sitemaps.push(value);
      continue;
    }
    if (!current) continue;
    if (field === 'allow' && value) current.allow.push(value);
    if (field === 'disallow' && value) current.disallow.push(value);
    if (field === 'crawl-delay') {
      const delay = Number.parseFloat(value);
      current.delay = Number.isFinite(delay) ? delay : null;
    }
  }

  const token = agentToken.toLowerCase();
  const specific = groups.filter((g) => g.agents.some((a) => a !== '*' && token.includes(a)));
  const chosen = specific.length > 0 ? specific : groups.filter((g) => g.agents.includes('*'));
  return {
    allow: chosen.flatMap((g) => g.allow),
    disallow: chosen.flatMap((g) => g.disallow),
    sitemaps,
    crawlDelaySeconds: chosen.find((g) => g.delay !== null)?.delay ?? null,
  };
}

/** Převede robots vzor (s `*` a `$`) na regulární výraz. */
function patternToRegex(pattern: string): RegExp {
  const anchored = pattern.endsWith('$');
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`);
}

/** Rozhodne, zda je cesta (včetně query) povolená. */
export function isPathAllowed(rules: RobotsRules, pathWithQuery: string): boolean {
  let best: { length: number; allow: boolean } | null = null;
  const consider = (patterns: string[], allow: boolean): void => {
    for (const p of patterns) {
      if (!patternToRegex(p).test(pathWithQuery)) continue;
      if (!best || p.length > best.length || (p.length === best.length && allow)) best = { length: p.length, allow };
    }
  };
  consider(rules.disallow, false);
  consider(rules.allow, true);
  return best === null ? true : (best as { allow: boolean }).allow;
}
