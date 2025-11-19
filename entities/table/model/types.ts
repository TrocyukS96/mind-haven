export interface TableData {
  id: string;
  name: string;
  type: 'finance' | 'projects' | 'custom';
  columns: string[];
  rows: { [key: string]: string }[];
}
