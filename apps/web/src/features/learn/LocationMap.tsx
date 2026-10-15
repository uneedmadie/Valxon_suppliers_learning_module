/**
 * Orientační mapa „VALXON (Praha) → sídlo dodavatele“. Jednoduchá projekce s mřížkou
 * poledníků a rovnoběžek; spojnice je ilustrativní a výslovně NEZNÁZORŇUJE přepravní trasu.
 */
import type { LearnLocation } from '@/api/types';

const WIDTH = 760;
const HEIGHT = 300;

/** Promítne zeměpisné souřadnice do SVG (ekvirektangulární projekce s korekcí šířky). */
function makeProjection(points: { lat: number; lng: number }[]) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  // Minimální výřez ~ 14° × 9°, aby blízká sídla nebyla nalepená na sobě.
  const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  const midLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;
  const cos = Math.cos((midLat * Math.PI) / 180);
  const spanLng = Math.max((Math.max(...lngs) - Math.min(...lngs)) * 1.6, 14);
  const spanLat = Math.max((Math.max(...lats) - Math.min(...lats)) * 1.8, 9);
  const scale = Math.min(WIDTH / (spanLng * cos), HEIGHT / spanLat);
  return {
    x: (lng: number) => WIDTH / 2 + (lng - midLng) * cos * scale,
    y: (lat: number) => HEIGHT / 2 - (lat - midLat) * scale,
    bounds: { minLng: midLng - WIDTH / 2 / (cos * scale), maxLng: midLng + WIDTH / 2 / (cos * scale), minLat: midLat - HEIGHT / 2 / scale, maxLat: midLat + HEIGHT / 2 / scale },
  };
}

export function LocationMap({ location, supplierName }: { location: LearnLocation; supplierName: string }) {
  const valxon = location.valxon;
  const p = makeProjection([valxon, location]);
  const ax = p.x(valxon.lng);
  const ay = p.y(valxon.lat);
  const bx = p.x(location.lng);
  const by = p.y(location.lat);
  // Oblouk spojnice: kontrolní bod nad středem úsečky.
  const cx = (ax + bx) / 2;
  const cy = Math.min(ay, by) - Math.max(40, Math.abs(ax - bx) * 0.18);

  // Mřížka po 5° v aktuálním výřezu.
  const meridians: number[] = [];
  for (let lng = Math.ceil(p.bounds.minLng / 5) * 5; lng <= p.bounds.maxLng; lng += 5) meridians.push(lng);
  const parallels: number[] = [];
  for (let lat = Math.ceil(p.bounds.minLat / 5) * 5; lat <= p.bounds.maxLat; lat += 5) parallels.push(lat);

  const sameCountry = location.countryCode === 'CZ';
  const supplierLabel = `${supplierName} · ${location.city ? `${location.city}, ` : ''}${location.countryName}`;

  return (
    <figure className="my-7 overflow-hidden rounded-lg border border-line bg-[#fcfcfd] p-4">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-auto w-full" role="img" aria-label={`Orientační poloha: VALXON Praha a ${supplierLabel}`}>
        <rect width={WIDTH} height={HEIGHT} fill="#fcfcfd" />
        {meridians.map((lng) => (
          <line key={`m${lng}`} x1={p.x(lng)} x2={p.x(lng)} y1={0} y2={HEIGHT} stroke="#eceef1" strokeWidth={1} />
        ))}
        {parallels.map((lat) => (
          <g key={`p${lat}`}>
            <line x1={0} x2={WIDTH} y1={p.y(lat)} y2={p.y(lat)} stroke="#eceef1" strokeWidth={1} />
            <text x={6} y={p.y(lat) - 4} fontSize={10} fill="#b4b8bf">{lat}° s. š.</text>
          </g>
        ))}
        {!sameCountry && (
          <path d={`M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`} fill="none" stroke="#e84248" strokeWidth={2} strokeDasharray="6 7" opacity={0.75} />
        )}
        <circle cx={ax} cy={ay} r={9} fill="#35383d" />
        <circle cx={ax} cy={ay} r={3.5} fill="#fff" />
        <text x={ax} y={ay + 26} fontSize={13} fontWeight={800} textAnchor="middle" fill="#35383d">VALXON</text>
        <text x={ax} y={ay + 42} fontSize={12} textAnchor="middle" fill="#6e7580">Praha · CZ</text>
        {!sameCountry && (
          <>
            <circle cx={bx} cy={by} r={11} fill="#e84248" />
            <circle cx={bx} cy={by} r={4} fill="#fff" />
            <text x={bx} y={by - 20} fontSize={13} fontWeight={800} textAnchor="middle" fill="#c72f39">{supplierName}</text>
            <text x={bx} y={by + 28} fontSize={12} textAnchor="middle" fill="#6e7580">{location.city ? `${location.city}, ` : ''}{location.countryName}</text>
          </>
        )}
      </svg>
      <figcaption className="mt-2 text-[11px] text-[#8b8e98]">
        Ilustrativní spojnice sídel{!sameCountry ? `, vzdušnou čarou cca ${location.distanceKm.toLocaleString('cs-CZ')} km` : ''}. Poloha dodavatele je orientační
        (podle {location.city ? 'země sídla' : 'hlavního města země'}); mapa neznázorňuje přepravní trasu ani délku dopravy.
      </figcaption>
    </figure>
  );
}
