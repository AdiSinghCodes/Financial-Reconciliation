'use client';

import { FileText, Database, TrendingUp, DollarSign, AlertTriangle, Eye, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface DataSummaryProps {
  gstData: any;
  aparData: any;
  onReconcile: () => void;
}

export default function DataSummary({ gstData, aparData, onReconcile }: DataSummaryProps) {
  const [missingPreview, setMissingPreview] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Helper function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Calculate value difference
  const valueDifference = Math.abs(
    (gstData.total_invoice_value || 0) - (aparData.total_invoice_value || 0)
  );
  const hasDifference = valueDifference > 0.01;

  // Load missing records preview
  const loadMissingPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const response = await fetch('http://localhost:8000/preview-missing');
      const data = await response.json();
      setMissingPreview(data);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview error:', error);
      alert('Failed to load missing records preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Data Summary
        </h2>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* GST Data Summary */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <FileText className="h-8 w-8 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">GST Filing Data</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Records:</span>
                <span className="font-semibold text-gray-900 text-lg">{gstData.records}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Fields:</span>
                <span className="font-semibold text-gray-900">{gstData.fields?.length || 0}</span>
              </div>
              
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span className="text-gray-600">Total Value:</span>
                  </div>
                  <span className="font-bold text-green-600 text-lg">
                    {formatCurrency(gstData.total_invoice_value || 0)}
                  </span>
                </div>
              </div>

              {gstData.duplicates?.has_duplicates && (
                <div className="pt-2">
                  <div className="flex items-center space-x-2 text-orange-600 text-sm bg-orange-50 p-2 rounded">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{gstData.warning}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AP/AR Data Summary */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Database className="h-8 w-8 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">AP/AR Ledger</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Records:</span>
                <span className="font-semibold text-gray-900 text-lg">{aparData.records}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Fields:</span>
                <span className="font-semibold text-gray-900">{aparData.fields?.length || 0}</span>
              </div>
              
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    <span className="text-gray-600">Total Value:</span>
                  </div>
                  <span className="font-bold text-blue-600 text-lg">
                    {formatCurrency(aparData.total_invoice_value || 0)}
                  </span>
                </div>
              </div>

              {aparData.duplicates?.has_duplicates && (
                <div className="pt-2">
                  <div className="flex items-center space-x-2 text-orange-600 text-sm bg-orange-50 p-2 rounded">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{aparData.warning}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Value Difference Alert */}
        {hasDifference && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-900 mb-1">Value Mismatch Detected</h4>
                <p className="text-sm text-yellow-800">
                  Total invoice values differ by <strong>{formatCurrency(valueDifference)}</strong>
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  This may indicate missing invoices or data entry errors. Review reconciliation results carefully.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* NEW: Quick Preview Button */}
        <div className="mb-6">
          <button
            onClick={loadMissingPreview}
            disabled={isLoadingPreview}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-purple-50 text-purple-700 rounded-lg font-semibold hover:bg-purple-100 transition-colors border border-purple-200"
          >
            <Eye className="h-5 w-5" />
            {isLoadingPreview ? 'Loading Preview...' : 'Quick Check: Preview Missing Records'}
          </button>
        </div>

        {/* Ready for Reconciliation */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <div>
              <h4 className="font-semibold text-green-900">Ready for Reconciliation</h4>
              <p className="text-sm text-green-700">
                Both datasets are loaded and validated. Click below to start AI-powered matching.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onReconcile}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Start Reconciliation
        </button>
      </div>

      {/* NEW: Missing Records Preview Panel */}
      {showPreview && missingPreview && (
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Missing Records Preview</h3>
            <button
              onClick={() => setShowPreview(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-600 mb-1">Common Records</p>
              <p className="text-2xl font-bold text-blue-900">{missingPreview.common_records}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="text-sm text-red-600 mb-1">Missing in AP/AR</p>
              <p className="text-2xl font-bold text-red-900">{missingPreview.missing_in_apar.count}</p>
              <p className="text-xs text-red-600 mt-1">
                Value: {formatCurrency(missingPreview.missing_in_apar.total_value)}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <p className="text-sm text-orange-600 mb-1">Missing in GST</p>
              <p className="text-2xl font-bold text-orange-900">{missingPreview.missing_in_gst.count}</p>
              <p className="text-xs text-orange-600 mt-1">
                Value: {formatCurrency(missingPreview.missing_in_gst.total_value)}
              </p>
            </div>
          </div>

          {/* Missing in AP/AR - FIXED TEXT COLORS */}
          {missingPreview.missing_in_apar.count > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Invoices in GST but Missing in AP/AR (Top 10)
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GSTIN</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {missingPreview.missing_in_apar.records.map((record: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-sm text-gray-900 font-medium">{record.invoice_no}</td>
                        <td className="px-4 py-2 font-mono text-sm text-gray-800">{record.gstin}</td>
                        <td className="px-4 py-2 text-right text-sm font-semibold text-gray-900">{formatCurrency(record.invoice_value)}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{record.invoice_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Missing in GST - FIXED TEXT COLORS */}
          {missingPreview.missing_in_gst.count > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Invoices in AP/AR but Missing in GST (Top 10)
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GSTIN</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {missingPreview.missing_in_gst.records.map((record: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-sm text-gray-900 font-medium">{record.invoice_no}</td>
                        <td className="px-4 py-2 font-mono text-sm text-gray-800">{record.gstin}</td>
                        <td className="px-4 py-2 text-right text-sm font-semibold text-gray-900">{formatCurrency(record.invoice_value)}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{record.invoice_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {missingPreview.missing_in_apar.count === 0 && missingPreview.missing_in_gst.count === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <p className="text-green-900 font-semibold">✓ Perfect! No missing records detected</p>
              <p className="text-sm text-green-700 mt-1">All invoices exist in both datasets</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}