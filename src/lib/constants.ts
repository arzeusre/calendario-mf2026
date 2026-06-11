// Hex colors for group border accents (A-L)
export const GROUP_COLORS: Record<string, string> = {
  "A": "#ef4444", // Red
  "B": "#3b82f6", // Blue
  "C": "#10b981", // Green
  "D": "#f59e0b", // Amber
  "E": "#8b5cf6", // Purple
  "F": "#ec4899", // Pink
  "G": "#06b6d4", // Cyan
  "H": "#14b8a6", // Teal
  "I": "#6366f1", // Indigo
  "J": "#a855f7", // Violet
  "K": "#d946ef", // Fuchsia
  "L": "#eab308"  // Yellow
};

export interface TvRegion {
  code: string;
  name: string;
  flagUrl: string | null;
}

export const TV_REGIONS: TvRegion[] = [
  { code: 'general', name: 'General (FIFA+ / TV Local)', flagUrl: null },
  { code: 'mx', name: 'México (TUDN, Azteca, ViX)', flagUrl: 'https://flagcdn.com/w40/mx.png' },
  { code: 'ar', name: 'Argentina (TyC, Telefe, DSports)', flagUrl: 'https://flagcdn.com/w40/ar.png' },
  { code: 'br', name: 'Brasil (Globo, CazéTV, SporTV)', flagUrl: 'https://flagcdn.com/w40/br.png' },
  { code: 'co', name: 'Colombia (Caracol, RCN, DGO)', flagUrl: 'https://flagcdn.com/w40/co.png' },
  { code: 'cl', name: 'Chile (CHV, Canal 13, DGO)', flagUrl: 'https://flagcdn.com/w40/cl.png' },
  { code: 'pe', name: 'Perú (América TV, DGO)', flagUrl: 'https://flagcdn.com/w40/pe.png' },
  { code: 'py', name: 'Paraguay (Trece, GEN, Unicanal, DGO)', flagUrl: 'https://flagcdn.com/w40/py.png' },
  { code: 'ec', name: 'Ecuador (Teleamazonas, ECDF, DGO)', flagUrl: 'https://flagcdn.com/w40/ec.png' },
  { code: 'bo', name: 'Bolivia (Unitel, Red Uno, Tigo, DGO)', flagUrl: 'https://flagcdn.com/w40/bo.png' },
  { code: 'uy', name: 'Uruguay (Antel TV, DGO)', flagUrl: 'https://flagcdn.com/w40/uy.png' },
  { code: 've', name: 'Venezuela (DSports, DGO, Inter)', flagUrl: 'https://flagcdn.com/w40/ve.png' },
  { code: 'es', name: 'España (RTVE, Teledeporte)', flagUrl: 'https://flagcdn.com/w40/es.png' },
  { code: 'us', name: 'EE. UU. (FOX, Telemundo, Peacock)', flagUrl: 'https://flagcdn.com/w40/us.png' }
];
