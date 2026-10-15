/**
 * Slovník zemí pro rozpoznání sídla dodavatele v textu a pro orientační mapu
 * VALXON (Praha) → sídlo. Souřadnice jsou hlavní města – mapa je ilustrativní,
 * nepředstírá přesnou polohu ani přepravní trasu.
 */

/** Záznam země. */
export interface CountryInfo {
  code: string;
  nameCs: string;
  /** Varianty názvu v textech (EN, CZ, DE, NL, místní). */
  aliases: string[];
  capital: string;
  lat: number;
  lng: number;
}

/** Sídlo VALXON – výchozí bod mapy. */
export const VALXON_HQ = { city: 'Praha', countryCode: 'CZ', lat: 50.0755, lng: 14.4378 } as const;

export const COUNTRIES: readonly CountryInfo[] = [
  { code: 'CZ', nameCs: 'Česko', aliases: ['Czech Republic', 'Czechia', 'Česká republika', 'Tschechien', 'Tsjechië'], capital: 'Praha', lat: 50.08, lng: 14.44 },
  { code: 'SK', nameCs: 'Slovensko', aliases: ['Slovakia', 'Slowakei', 'Slowakije'], capital: 'Bratislava', lat: 48.15, lng: 17.11 },
  { code: 'PL', nameCs: 'Polsko', aliases: ['Poland', 'Polska', 'Polen'], capital: 'Varšava', lat: 52.23, lng: 21.01 },
  { code: 'DE', nameCs: 'Německo', aliases: ['Germany', 'Deutschland', 'Duitsland'], capital: 'Berlín', lat: 52.52, lng: 13.4 },
  { code: 'AT', nameCs: 'Rakousko', aliases: ['Austria', 'Österreich', 'Oostenrijk'], capital: 'Vídeň', lat: 48.21, lng: 16.37 },
  { code: 'NL', nameCs: 'Nizozemsko', aliases: ['Netherlands', 'The Netherlands', 'Holland', 'Nederland', 'Niederlande'], capital: 'Amsterdam', lat: 52.37, lng: 4.9 },
  { code: 'BE', nameCs: 'Belgie', aliases: ['Belgium', 'België', 'Belgien', 'Belgique'], capital: 'Brusel', lat: 50.85, lng: 4.35 },
  { code: 'LU', nameCs: 'Lucembursko', aliases: ['Luxembourg', 'Luxemburg'], capital: 'Lucemburk', lat: 49.61, lng: 6.13 },
  { code: 'FR', nameCs: 'Francie', aliases: ['France', 'Frankreich', 'Frankrijk'], capital: 'Paříž', lat: 48.86, lng: 2.35 },
  { code: 'GB', nameCs: 'Spojené království', aliases: ['United Kingdom', 'UK', 'Great Britain', 'England', 'Scotland', 'Wales', 'Velká Británie'], capital: 'Londýn', lat: 51.51, lng: -0.13 },
  { code: 'IE', nameCs: 'Irsko', aliases: ['Ireland', 'Irland', 'Ierland'], capital: 'Dublin', lat: 53.35, lng: -6.26 },
  { code: 'DK', nameCs: 'Dánsko', aliases: ['Denmark', 'Danmark', 'Dänemark', 'Denemarken'], capital: 'Kodaň', lat: 55.68, lng: 12.57 },
  { code: 'SE', nameCs: 'Švédsko', aliases: ['Sweden', 'Sverige', 'Schweden', 'Zweden'], capital: 'Stockholm', lat: 59.33, lng: 18.07 },
  { code: 'NO', nameCs: 'Norsko', aliases: ['Norway', 'Norge', 'Norwegen', 'Noorwegen'], capital: 'Oslo', lat: 59.91, lng: 10.75 },
  { code: 'FI', nameCs: 'Finsko', aliases: ['Finland', 'Suomi', 'Finnland'], capital: 'Helsinky', lat: 60.17, lng: 24.94 },
  { code: 'CH', nameCs: 'Švýcarsko', aliases: ['Switzerland', 'Schweiz', 'Suisse', 'Zwitserland'], capital: 'Bern', lat: 46.95, lng: 7.45 },
  { code: 'IT', nameCs: 'Itálie', aliases: ['Italy', 'Italia', 'Italien', 'Italië'], capital: 'Řím', lat: 41.9, lng: 12.5 },
  { code: 'ES', nameCs: 'Španělsko', aliases: ['Spain', 'España', 'Spanien', 'Spanje'], capital: 'Madrid', lat: 40.42, lng: -3.7 },
  { code: 'PT', nameCs: 'Portugalsko', aliases: ['Portugal'], capital: 'Lisabon', lat: 38.72, lng: -9.14 },
  { code: 'HU', nameCs: 'Maďarsko', aliases: ['Hungary', 'Magyarország', 'Ungarn', 'Hongarije'], capital: 'Budapešť', lat: 47.5, lng: 19.04 },
  { code: 'SI', nameCs: 'Slovinsko', aliases: ['Slovenia', 'Slowenien'], capital: 'Lublaň', lat: 46.06, lng: 14.51 },
  { code: 'HR', nameCs: 'Chorvatsko', aliases: ['Croatia', 'Hrvatska', 'Kroatien'], capital: 'Záhřeb', lat: 45.81, lng: 15.98 },
  { code: 'RO', nameCs: 'Rumunsko', aliases: ['Romania', 'România', 'Rumänien', 'Roemenië'], capital: 'Bukurešť', lat: 44.43, lng: 26.1 },
  { code: 'BG', nameCs: 'Bulharsko', aliases: ['Bulgaria', 'Bulgarien'], capital: 'Sofie', lat: 42.7, lng: 23.32 },
  { code: 'GR', nameCs: 'Řecko', aliases: ['Greece', 'Griechenland', 'Griekenland'], capital: 'Athény', lat: 37.98, lng: 23.73 },
  { code: 'LT', nameCs: 'Litva', aliases: ['Lithuania', 'Litauen'], capital: 'Vilnius', lat: 54.69, lng: 25.28 },
  { code: 'LV', nameCs: 'Lotyšsko', aliases: ['Latvia', 'Lettland'], capital: 'Riga', lat: 56.95, lng: 24.11 },
  { code: 'EE', nameCs: 'Estonsko', aliases: ['Estonia', 'Estland'], capital: 'Tallinn', lat: 59.44, lng: 24.75 },
  { code: 'TR', nameCs: 'Turecko', aliases: ['Turkey', 'Türkiye', 'Türkei', 'Turkije'], capital: 'Ankara', lat: 39.93, lng: 32.86 },
  { code: 'UA', nameCs: 'Ukrajina', aliases: ['Ukraine'], capital: 'Kyjev', lat: 50.45, lng: 30.52 },
  { code: 'CN', nameCs: 'Čína', aliases: ['China', 'PRC'], capital: 'Peking', lat: 39.9, lng: 116.4 },
  { code: 'HK', nameCs: 'Hongkong', aliases: ['Hong Kong'], capital: 'Hongkong', lat: 22.32, lng: 114.17 },
  { code: 'TW', nameCs: 'Tchaj-wan', aliases: ['Taiwan'], capital: 'Tchaj-pej', lat: 25.03, lng: 121.57 },
  { code: 'IN', nameCs: 'Indie', aliases: ['India', 'Indien'], capital: 'Nové Dillí', lat: 28.61, lng: 77.21 },
  { code: 'BD', nameCs: 'Bangladéš', aliases: ['Bangladesh'], capital: 'Dháka', lat: 23.81, lng: 90.41 },
  { code: 'PK', nameCs: 'Pákistán', aliases: ['Pakistan'], capital: 'Islámábád', lat: 33.68, lng: 73.05 },
  { code: 'VN', nameCs: 'Vietnam', aliases: ['Vietnam', 'Viet Nam'], capital: 'Hanoj', lat: 21.03, lng: 105.85 },
  { code: 'US', nameCs: 'USA', aliases: ['United States', 'USA', 'U.S.A.', 'Vereinigte Staaten'], capital: 'Washington', lat: 38.9, lng: -77.04 },
  { code: 'CA', nameCs: 'Kanada', aliases: ['Canada', 'Kanada'], capital: 'Ottawa', lat: 45.42, lng: -75.7 },
];

/** Najde zemi podle ISO kódu. */
export function countryByCode(code: string | null | undefined): CountryInfo | null {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code.toUpperCase()) ?? null;
}

/** Najde první zemi zmíněnou v textu (podle aliasů nebo českého názvu). */
export function findCountryInText(text: string): CountryInfo | null {
  for (const country of COUNTRIES) {
    for (const name of [...country.aliases, country.nameCs]) {
      // Krátké aliasy (UK, USA) vyžadují hranice slova a velká písmena, aby nevznikaly falešné shody.
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, name.length <= 3 ? 'u' : 'iu');
      if (re.test(text)) return country;
    }
  }
  return null;
}

/** Vzdušná vzdálenost dvou bodů v km (haversine) – jen pro orientační popisek mapy. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
}
