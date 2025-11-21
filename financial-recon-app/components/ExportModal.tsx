'use client';

import { useState } from 'react';
import { X, Download, FileText, CheckSquare, Square } from 'lucide-react';
import { exportToCSV, exportToPDF, ExportOptions } from '@/lib/exportUtils';

interface ExportModalProps {
  data: any;
  onClose: () => void;
  format: 'csv' | 'pdf';
}

export default function ExportModal({ data, onClose, format }: ExportModalProps) {
  const [options, setOptions] = useState<ExportOptions>({
    includeMatched: true,
    includePartial: true,
    includeMismatched: true,
    includeMissingGST: true,
    includeMissingAPAR: true,
    includeConfidence: true,
    includeReasons: true,
  });

  const [isExporting, setIsExporting] = useState(false);

  const toggleOption = (key: keyof ExportOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      if (format === 'csv') {
        exportToCSV(data, options);
      } else {
        await exportToPDF(data, options);
      }
      
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
      setIsExporting(false);
    }
  };

  const CheckboxOption = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
    >
      {checked ? (
        <CheckSquare className="h-5 w-5 text-blue-600 flex-shrink-0" />
      ) : (
        <Square className="h-5 w-5 text-gray-400 flex-shrink-0" />
      )}
      <span className={`text-sm ${checked ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
        {label}
      </span>
    </button>
  );

  const totalRecords = 
    (options.includeMatched ? data.summary.matched : 0) +
    (options.includePartial ? data.summary.partialMatch : 0) +
    (options.includeMismatched ? data.summary.mismatched : 0) +
    (options.includeMissingGST ? data.summary.missingInGST : 0) +
    (options.includeMissingAPAR ? data.summary.missingInAPAR : 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Configure Export</h2>
              <p className="text-blue-100">
                {format === 'csv' ? 'Export as CSV' : 'Export as PDF/HTML'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Record Types */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Include Record Types</h3>
            <div className="space-y-1 bg-gray-50 rounded-lg p-3">
              <CheckboxOption
                label={`Matched Records (${data.summary.matched})`}
                checked={options.includeMatched}
                onChange={() => toggleOption('includeMatched')}
              />
              <CheckboxOption
                label={`Partial Match Records (${data.summary.partialMatch})`}
                checked={options.includePartial}
                onChange={() => toggleOption('includePartial')}
              />
              <CheckboxOption
                label={`Mismatched Records (${data.summary.mismatched})`}
                checked={options.includeMismatched}
                onChange={() => toggleOption('includeMismatched')}
              />
              <CheckboxOption
                label={`Missing in GST (${data.summary.missingInGST})`}
                checked={options.includeMissingGST}
                onChange={() => toggleOption('includeMissingGST')}
              />
              <CheckboxOption
                label={`Missing in AP/AR (${data.summary.missingInAPAR})`}
                checked={options.includeMissingAPAR}
                onChange={() => toggleOption('includeMissingAPAR')}
              />
            </div>
          </div>

          {/* Additional Fields */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Fields</h3>
            <div className="space-y-1 bg-gray-50 rounded-lg p-3">
              <CheckboxOption
                label="Include Confidence Scores"
                checked={options.includeConfidence}
                onChange={() => toggleOption('includeConfidence')}
              />
              <CheckboxOption
                label="Include Mismatch Reasons"
                checked={options.includeReasons}
                onChange={() => toggleOption('includeReasons')}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-800 font-medium">Total Records to Export</p>
                <p className="text-xs text-blue-600 mt-1">Based on your current selection</p>
              </div>
              <div className="text-3xl font-bold text-blue-900">{totalRecords}</div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Quick Presets:</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setOptions({
                  includeMatched: false,
                  includePartial: true,
                  includeMismatched: true,
                  includeMissingGST: true,
                  includeMissingAPAR: true,
                  includeConfidence: true,
                  includeReasons: true,
                })}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
              >
                Issues Only
              </button>
              <button
                onClick={() => setOptions({
                  includeMatched: true,
                  includePartial: true,
                  includeMismatched: true,
                  includeMissingGST: true,
                  includeMissingAPAR: true,
                  includeConfidence: true,
                  includeReasons: true,
                })}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
              >
                All Records
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || totalRecords === 0}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  <span>Export {format.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}