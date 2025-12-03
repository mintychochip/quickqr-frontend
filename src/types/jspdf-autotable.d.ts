declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  interface AutoTableOptions {
    startY?: number;
    head?: string[][];
    body?: string[][];
    theme?: 'striped' | 'grid' | 'plain';
    headStyles?: Record<string, any>;
    bodyStyles?: Record<string, any>;
    alternateRowStyles?: Record<string, any>;
    margin?: { left?: number; right?: number; top?: number; bottom?: number };
  }

  export default function autoTable(doc: jsPDF, options: AutoTableOptions): void;
}
