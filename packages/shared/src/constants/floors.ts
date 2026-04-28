export interface FloorInfo {
  id: number;
  name: string;
  theme: string;
  color: string;
}

export const FLOORS: FloorInfo[] = [
  { id: 2, name: '2F', theme: 'pink', color: '#FFF0F5' },
  { id: 3, name: '3F', theme: 'mint', color: '#E8F5E9' },
  { id: 4, name: '4F', theme: 'lavender', color: '#F3E5F5' },
  { id: 5, name: '5F', theme: 'blue', color: '#E3F2FD' },
  { id: 6, name: '6F', theme: 'cream', color: '#FFFDE7' },
];

export const MIN_FLOOR = 2;
export const MAX_FLOOR = 6;
export const DEFAULT_FLOOR = 2;
