'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Download, AlertCircle, TrendingUp, CheckCircle, XCircle, Filter, ChevronDown, ChevronUp, Info, Search } from 'lucide-react';
import MismatchDrillDown from './MismatchDrillDown';

import ExportModal from './ExportModal';

interface ReconciliationResultsProps {
  results: any;
  onReset: () => void;
}

export default function ReconciliationResults({ results, onReset }: ReconciliationResultsProps) {
  const { summary, insights, details } = results;
  
  // State for table filters and sorting
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showConfidenceInfo, setShowConfidenceInfo] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const recordsPerPage = 10;
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');

  // Generate timestamped filename
  const generateTimestampedFilename = (format: 'csv' | 'pdf'): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `Reconciliation_Report_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.${format}`;
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    setExportFormat(format);
    setShowExportModal(true);
  };

  const chartData = [
    { name: 'Matched', value: summary.matched, color: '#10b981' },
    { name: 'Partial Match', value: summary.partialMatch, color: '#f59e0b' },
    { name: 'Mismatched', value: summary.mismatched, color: '#ef4444' },
    { name: 'Missing in GST', value: summary.missingInGST, color: '#8b5cf6' },
    { name: 'Missing in AP/AR', value: summary.missingInAPAR, color: '#3b82f6' },
  ];

  const totalRecords = summary.matched + summary.partialMatch + summary.mismatched + 
                       summary.missingInGST + summary.missingInAPAR;

  // Combine all records for the table
  const allRecords = [
    ...(details.matched || []).map((r: any) => ({ ...r, category: 'matched' })),
    ...(details.partialMatch || []).map((r: any) => ({ ...r, category: 'partial' })),
    ...(details.mismatched || []).map((r: any) => ({ ...r, category: 'mismatched' })),
    ...(details.missingInGST || []).map((r: any) => ({ ...r, category: 'missing_gst' })),
    ...(details.missingInAPAR || []).map((r: any) => ({ ...r, category: 'missing_apar' })),
  ];

  // Calculate confidence distribution
  const confidenceDistribution = [
    { range: '90-100%', count: allRecords.filter(r => r.Confidence >= 0.9).length, color: '#10b981' },
    { range: '70-89%', count: allRecords.filter(r => r.Confidence >= 0.7 && r.Confidence < 0.9).length, color: '#3b82f6' },
    { range: '50-69%', count: allRecords.filter(r => r.Confidence >= 0.5 && r.Confidence < 0.7).length, color: '#f59e0b' },
    { range: '0-49%', count: allRecords.filter(r => r.Confidence < 0.5).length, color: '#ef4444' },
  ];

  // Calculate average confidence
  const recordsWithConfidence = allRecords.filter(r => r.Confidence !== undefined);
  const averageConfidence = recordsWithConfidence.length > 0
    ? (recordsWithConfidence.reduce((sum, r) => sum + r.Confidence, 0) / recordsWithConfidence.length * 100).toFixed(1)
    : 0;

  // Filter records based on selected filter
  const filteredRecords = selectedFilter === 'all' 
    ? allRecords 
    : allRecords.filter(r => r.category === selectedFilter);

  // Pagination
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-100';
    if (confidence >= 0.7) return 'text-blue-600 bg-blue-100';
    if (confidence >= 0.5) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  // Get confidence bar color
  const getConfidenceBarColor = (confidence: number) => {
    if (confidence >= 0.9) return '#10b981';
    if (confidence >= 0.7) return '#3b82f6';
    if (confidence >= 0.5) return '#f59e0b';
    return '#ef4444';
  };

  // Get confidence label
  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    if (confidence >= 0.5) return 'Low';
    return 'Very Low';
  };

  // Get row color based on category
  const getRowColor = (category: string) => {
    switch (category) {
      case 'matched': return 'bg-green-50 border-l-4 border-green-500';
      case 'partial': return 'bg-orange-50 border-l-4 border-orange-500';
      case 'mismatched': return 'bg-red-50 border-l-4 border-red-500';
      case 'missing_gst': return 'bg-purple-50 border-l-4 border-purple-500';
      case 'missing_apar': return 'bg-blue-50 border-l-4 border-blue-500';
      default: return 'bg-white';
    }
  };

  // Get badge color
  const getBadgeColor = (category: string) => {
    switch (category) {
      case 'matched': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-orange-100 text-orange-800';
      case 'mismatched': return 'bg-red-100 text-red-800';
      case 'missing_gst': return 'bg-purple-100 text-purple-800';
      case 'missing_apar': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get category label
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'matched': return 'Exact Match';
      case 'partial': return 'Partial Match';
      case 'mismatched': return 'Mismatched';
      case 'missing_gst': return 'Missing in GST';
      case 'missing_apar': return 'Missing in AP/AR';
      default: return category;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Reconciliation Complete</h2>
            <p className="text-gray-600 mt-1">
              {totalRecords} records processed with {summary.matchRate}% match rate
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-gray-500">Average Confidence:</span>
              <span className="text-lg font-bold text-blue-600">{averageConfidence}%</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
            <button
              onClick={onReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Start New Reconciliation
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Matched</p>
              <p className="text-2xl font-bold text-gray-900">{summary.matched}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Partial Match</p>
              <p className="text-2xl font-bold text-gray-900">{summary.partialMatch}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Mismatched</p>
              <p className="text-2xl font-bold text-gray-900">{summary.mismatched}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Missing in GST</p>
              <p className="text-2xl font-bold text-gray-900">{summary.missingInGST}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Missing in AP/AR</p>
              <p className="text-2xl font-bold text-gray-900">{summary.missingInAPAR}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Match Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Confidence Distribution Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Confidence Distribution</h3>
            <button
              onClick={() => setShowConfidenceInfo(!showConfidenceInfo)}
              className="text-blue-600 hover:text-blue-800"
              title="How is confidence calculated?"
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
          
          {showConfidenceInfo && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-900">
              <p className="font-semibold mb-1">Confidence Score Calculation:</p>
              <ul className="space-y-1 ml-3">
                <li>• <strong>100%:</strong> Exact match (invoice no, GSTIN, amount)</li>
                <li>• <strong>70-99%:</strong> Partial match (amount within ±2%)</li>
                <li>• <strong>0%:</strong> Mismatched or missing records</li>
              </ul>
            </div>
          )}

          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={confidenceDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6">
                {confidenceDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Insights */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Insights</h3>
          <ul className="space-y-3">
            {insights.map((insight: string, idx: number) => (
              <li key={idx} className="flex items-start space-x-2 text-sm text-gray-700">
                <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Detailed Reconciliation Table */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Reconciliation Records</h3>
          
          {/* Filter Dropdown - FIXED TEXT COLORS */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={selectedFilter}
              onChange={(e) => {
                setSelectedFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
            >
              <option value="all" className="text-gray-900 font-medium">All Records ({allRecords.length})</option>
              <option value="matched" className="text-gray-900 font-medium">Matched ({details.matched?.length || 0})</option>
              <option value="partial" className="text-gray-900 font-medium">Partial Match ({details.partialMatch?.length || 0})</option>
              <option value="mismatched" className="text-gray-900 font-medium">Mismatched ({details.mismatched?.length || 0})</option>
              <option value="missing_gst" className="text-gray-900 font-medium">Missing in GST ({details.missingInGST?.length || 0})</option>
              <option value="missing_apar" className="text-gray-900 font-medium">Missing in AP/AR ({details.missingInAPAR?.length || 0})</option>
            </select>
          </div>
        </div>

        {/* Table - FIXED TEXT COLORS */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice No
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GSTIN
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GST Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AP/AR Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Difference
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No records found for this filter
                  </td>
                </tr>
              ) : (
                currentRecords.map((record: any, idx: number) => (
                  <tr key={idx} className={`${getRowColor(record.category)} transition-colors`}>
                    {/* FIXED: Invoice No - Dark text with medium weight */}
                    <td className="px-4 py-3 text-sm font-mono text-gray-900 font-medium">{record.Invoice_No}</td>
                    
                    {/* FIXED: GSTIN - Darker text */}
                    <td className="px-4 py-3 text-sm font-mono text-gray-800">{record.GSTIN}</td>
                    
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getBadgeColor(record.category)}`}>
                        {getCategoryLabel(record.category)}
                      </span>
                    </td>
                    
                    {/* FIXED: GST Amount - Dark text with bold weight */}
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                      {record.GST_Amount ? formatCurrency(record.GST_Amount) : '-'}
                    </td>
                    
                    {/* FIXED: AP/AR Amount - Dark text with bold weight */}
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                      {record.APAR_Amount ? formatCurrency(record.APAR_Amount) : '-'}
                    </td>
                    
                    <td className="px-4 py-3 text-sm text-right">
                      {record.Difference !== undefined ? (
                        <span className={record.Difference > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                          {formatCurrency(record.Difference)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {record.Confidence !== undefined ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${getConfidenceColor(record.Confidence)}`}>
                            {(record.Confidence * 100).toFixed(0)}%
                          </span>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${record.Confidence * 100}%`,
                                backgroundColor: getConfidenceBarColor(record.Confidence)
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{getConfidenceLabel(record.Confidence)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="text-purple-600 hover:text-purple-800 p-1 hover:bg-purple-50 rounded transition-colors"
                          title="View Details"
                        >
                          <Search className="h-5 w-5" />
                        </button>
                        
                        <button
                          onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                          className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                          title="Expand/Collapse"
                        >
                          {expandedRow === idx ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Expanded Row Details */}
        {expandedRow !== null && currentRecords[expandedRow] && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">Additional Details</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {currentRecords[expandedRow].GST_Date && (
                <div>
                  <p className="text-gray-500">GST Date</p>
                  <p className="font-semibold">{currentRecords[expandedRow].GST_Date}</p>
                </div>
              )}
              {currentRecords[expandedRow].APAR_Date && (
                <div>
                  <p className="text-gray-500">AP/AR Date</p>
                  <p className="font-semibold">{currentRecords[expandedRow].APAR_Date}</p>
                </div>
              )}
              {currentRecords[expandedRow].Date_Mismatch && (
                <div>
                  <p className="text-gray-500">Date Difference</p>
                  <p className="font-semibold text-orange-600">
                    {currentRecords[expandedRow].Date_Difference_Days} days
                  </p>
                </div>
              )}
              {currentRecords[expandedRow].Confidence !== undefined && (
                <div>
                  <p className="text-gray-500">Confidence Score</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      {(currentRecords[expandedRow].Confidence * 100).toFixed(0)}%
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded ${getConfidenceColor(currentRecords[expandedRow].Confidence)}`}>
                      {getConfidenceLabel(currentRecords[expandedRow].Confidence)}
                    </span>
                  </div>
                </div>
              )}
              {currentRecords[expandedRow].Reason && (
                <div className="col-span-2 md:col-span-4">
                  <p className="text-gray-500">Reason</p>
                  <p className="font-semibold text-gray-700">{currentRecords[expandedRow].Reason}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredRecords.length)} of {filteredRecords.length} records
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drill-Down Modal */}
      {selectedRecord && (
        <MismatchDrillDown
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
      {showExportModal && (
        <ExportModal
          data={results}
          format={exportFormat}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}