// Bulk QR Upload Component - Phase 1 MVP
// CSV upload with preview and validation

import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';

interface CSVRow {
  [key: string]: string;
}

interface BulkUploadProps {
  onUpload: (csvContent: string, operationType: string) => Promise<void>;
  isLoading?: boolean;
}

export function BulkUpload({ onUpload, isLoading = false }: BulkUploadProps) {
  const [csvData, setCsvData] = useState<CSVRow[] | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<CSVRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function parseCSV(csvContent: string): CSVRow[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return rows;
  }

  function validateCSV(rows: CSVRow[]): string[] {
    const errors: string[] = [];

    if (rows.length === 0) {
      errors.push('CSV file is empty or has no data rows');
      return errors;
    }

    const firstRow = rows[0];
    const hasUrl = Object.keys(firstRow).some(k => k.toLowerCase() === 'url');
    const hasTitle = Object.keys(firstRow).some(k => k.toLowerCase() === 'title');

    if (!hasUrl) {
      errors.push('Missing required column: url');
    }
    if (!hasTitle) {
      errors.push('Missing required column: title');
    }

    rows.forEach((row, index) => {
      const rowNum = index + 2;

      if (!row.url || row.url.trim() === '') {
        errors.push(`Row ${rowNum}: Missing URL`);
      } else {
        const urlPattern = /^https?:\/\//;
        if (!urlPattern.test(row.url)) {
          errors.push(`Row ${rowNum}: Invalid URL format '${row.url}'`);
        }
      }

      if (!row.title || row.title.trim() === '') {
        errors.push(`Row ${rowNum}: Missing title`);
      }
    });

    return errors;
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      const errors = validateCSV(rows);

      setCsvData(rows);
      setValidationErrors(errors);
      setPreviewRows(rows.slice(0, 5));
      setIsProcessing(false);
    };
    reader.readAsText(file);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file || !file.name.endsWith('.csv')) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      const errors = validateCSV(rows);

      setCsvData(rows);
      setValidationErrors(errors);
      setPreviewRows(rows.slice(0, 5));
      setIsProcessing(false);
    };
    reader.readAsText(file);
  }

  function handleUpload() {
    if (!csvData || validationErrors.length > 0) return;

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => row[h] || '').join(',')),
    ].join('\n');

    onUpload(csvContent, 'create');
  }

  function clearFile() {
    setCsvData(null);
    setValidationErrors([]);
    setPreviewRows([]);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing bulk upload...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!csvData ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors border-gray-300 hover:border-gray-400 hover:bg-gray-50"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="dropzone-input"
          />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700">
            Drag & drop a CSV file
          </p>
          <p className="text-sm text-gray-500 mt-2">
            or <button onClick={() => fileInputRef.current?.click()} className="text-blue-600 hover:underline">click to select</button>
          </p>
          <p className="text-xs text-gray-400 mt-4">
            Required columns: url, title. Optional: type, tags, design_template, utm_source, utm_medium, utm_campaign
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              <span className="font-medium">{fileName}</span>
              <span className="text-sm text-gray-500">({csvData.length} rows)</span>
            </div>
            <button
              onClick={clearFile}
              className="text-gray-400 hover:text-gray-600"
              data-testid="clear-file"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {validationErrors.length > 0 ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Validation Errors</h4>
                  <ul className="mt-2 text-sm text-red-700 space-y-1">
                    {validationErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-700 font-medium">
                  All {csvData.length} rows validated successfully
                </span>
              </div>
            </div>
          )}

          {previewRows.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Preview (first {previewRows.length} rows)
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(previewRows[0]).map((header) => (
                        <th
                          key={header}
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewRows.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((value, j) => (
                          <td key={j} className="px-3 py-2 text-sm text-gray-900 truncate max-w-xs">
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {validationErrors.length === 0 && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleUpload}
                disabled={isProcessing}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                data-testid="upload-button"
              >
                {isProcessing ? 'Processing...' : `Create ${csvData.length} QR Codes`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
