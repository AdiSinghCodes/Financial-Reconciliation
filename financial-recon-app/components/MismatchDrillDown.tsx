'use client';

import { X, AlertTriangle, Calendar, DollarSign, FileText, CheckCircle, Flag } from 'lucide-react';
import { useState } from 'react';

interface MismatchDrillDownProps {
  record: any;
  onClose: () => void;
}

export default function MismatchDrillDown({ record, onClose }: MismatchDrillDownProps) {
  const [markedForReview, setMarkedForReview] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getMatchType = () => {
    if (record.category === 'matched') return { label: 'Exact Match', color: 'green' };
    if (record.category === 'partial') return { label: 'Partial Match', color: 'orange' };
    if (record.category === 'mismatched') return { label: 'Mismatched', color: 'red' };
    if (record.category === 'missing_gst') return { label: 'Missing in GST', color: 'purple' };
    if (record.category === 'missing_apar') return { label: 'Missing in AP/AR', color: 'blue' };
    return { label: 'Unknown', color: 'gray' };
  };

  const matchType = getMatchType();

  // Detect differences
  const hasAmountDiff = record.GST_Amount && record.APAR_Amount && 
                        Math.abs(record.GST_Amount - record.APAR_Amount) > 0.01;
  const hasDateDiff = record.Date_Mismatch === true;
  const isMissing = record.category === 'missing_gst' || record.category === 'missing_apar';

  // Generate suggested actions
  const getSuggestedActions = () => {
    const actions = [];
    
    if (record.category === 'mismatched') {
      actions.push('Verify invoice amount in source documents');
      actions.push('Check for TDS deductions or adjustments');
      actions.push('Contact vendor/customer for clarification');
    } else if (record.category === 'partial') {
      actions.push('Check if TDS was deducted (common cause of ±2% variance)');
      actions.push('Verify payment processing fees or bank charges');
    } else if (record.category === 'missing_apar') {
      actions.push('Add invoice to AP/AR ledger');
      actions.push('Verify if invoice was recorded under different number');
    } else if (record.category === 'missing_gst') {
      actions.push('File GST return for this invoice');
      actions.push('Check if invoice should be exempt from GST');
    }

    if (hasDateDiff) {
      actions.push(`Investigate ${record.Date_Difference_Days}-day date discrepancy`);
    }

    return actions;
  };

  const suggestedActions = getSuggestedActions();

  const handleMarkForReview = () => {
    setMarkedForReview(!markedForReview);
    // In a real app, this would save to backend/local storage
    if (!markedForReview) {
      alert(`Invoice ${record.Invoice_No} marked for review`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`bg-${matchType.color}-100 border-b border-${matchType.color}-200 p-6 flex justify-between items-start sticky top-0 z-10`}>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">Invoice Details</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold bg-${matchType.color}-200 text-${matchType.color}-800`}>
                {matchType.label}
              </span>
            </div>
            <p className="text-gray-700 font-mono">{record.Invoice_No}</p>
            <p className="text-sm text-gray-600 mt-1">GSTIN: {record.GSTIN}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Issue Summary */}
          {!isMissing && (hasAmountDiff || hasDateDiff) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">Issues Detected</h3>
                  <ul className="space-y-1 text-sm text-red-800">
                    {hasAmountDiff && (
                      <li>• Amount mismatch: {formatCurrency(Math.abs(record.Difference || 0))} difference</li>
                    )}
                    {hasDateDiff && (
                      <li>• Date discrepancy: {record.Date_Difference_Days} days apart</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Missing Record Alert */}
          {isMissing && (
            <div className={`bg-${matchType.color}-50 border border-${matchType.color}-200 rounded-lg p-4`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`h-6 w-6 text-${matchType.color}-600 flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <h3 className={`font-semibold text-${matchType.color}-900 mb-1`}>Missing Record</h3>
                  <p className={`text-sm text-${matchType.color}-800`}>
                    This invoice exists in {record.category === 'missing_gst' ? 'AP/AR' : 'GST'} but is missing in {record.category === 'missing_gst' ? 'GST' : 'AP/AR'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Side-by-Side Comparison */}
          {!isMissing && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* GST Data */}
              <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-300">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">GST Filing Data</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" /> Invoice Amount
                    </p>
                    <p className={`text-xl font-bold ${hasAmountDiff ? 'text-red-600' : 'text-gray-900'}`}>
                      {record.GST_Amount ? formatCurrency(record.GST_Amount) : 'N/A'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Invoice Date
                    </p>
                    <p className={`text-lg font-semibold ${hasDateDiff ? 'text-orange-600' : 'text-gray-900'}`}>
                      {record.GST_Date || 'N/A'}
                    </p>
                  </div>

                  {record.Confidence !== undefined && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Match Confidence</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-blue-600"
                            style={{ width: `${record.Confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold">{(record.Confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AP/AR Data */}
              <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-300">
                  <FileText className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">AP/AR Ledger Data</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" /> Invoice Amount
                    </p>
                    <p className={`text-xl font-bold ${hasAmountDiff ? 'text-red-600' : 'text-gray-900'}`}>
                      {record.APAR_Amount ? formatCurrency(record.APAR_Amount) : 'N/A'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Invoice Date
                    </p>
                    <p className={`text-lg font-semibold ${hasDateDiff ? 'text-orange-600' : 'text-gray-900'}`}>
                      {record.APAR_Date || 'N/A'}
                    </p>
                  </div>

                  {hasAmountDiff && record.Difference !== undefined && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Difference</p>
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(record.Difference)}
                        {record.Difference_Percentage && (
                          <span className="text-sm ml-2">({record.Difference_Percentage}%)</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Single Record View for Missing */}
          {isMissing && (
            <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-300">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">
                  {record.category === 'missing_gst' ? 'AP/AR' : 'GST'} Data
                </h3>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Invoice Amount</p>
                  <p className="text-xl font-bold text-gray-900">
                    {record.APAR_Amount ? formatCurrency(record.APAR_Amount) : formatCurrency(record.GST_Amount)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Invoice Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {record.APAR_Date || record.GST_Date || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Reason */}
          {record.Reason && (
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h3 className="font-semibold text-blue-900 mb-2">Analysis</h3>
              <p className="text-sm text-blue-800">{record.Reason}</p>
            </div>
          )}

          {/* Suggested Actions */}
          <div className="border border-green-200 rounded-lg p-4 bg-green-50">
            <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Suggested Actions
            </h3>
            <ul className="space-y-2">
              {suggestedActions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-green-800">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleMarkForReview}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-semibold transition-colors ${
                markedForReview
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300'
              }`}
            >
              <Flag className="h-5 w-5" />
              {markedForReview ? 'Marked for Review ✓' : 'Mark for Review'}
            </button>
            
            <button
              onClick={() => {
                const csvContent = `Invoice_No,GSTIN,GST_Amount,APAR_Amount,Difference,Status\n${record.Invoice_No},${record.GSTIN},${record.GST_Amount || 'N/A'},${record.APAR_Amount || 'N/A'},${record.Difference || 0},${matchType.label}`;
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${record.Invoice_No}_details.csv`;
                a.click();
              }}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Export Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}