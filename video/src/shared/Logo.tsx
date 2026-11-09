import { C } from "./theme";

// The app icon: two slanted tape bars, orange (effects) and ice-blue (music).
export const Logo: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" rx="6" fill={C.surface} />
    <path d="M9 6h5l-3 20H6z" fill={C.fx} />
    <path d="M19 6h5l-3 20h-5z" fill={C.bgm} />
  </svg>
);
