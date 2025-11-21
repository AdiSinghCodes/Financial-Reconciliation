export interface ExportOptions {
  includeMatched: boolean;
  includePartial: boolean;
  includeMismatched: boolean;
  includeMissingGST: boolean;
  includeMissingAPAR: boolean;
  includeConfidence: boolean;
  includeReasons: boolean;
}

export const generateTimestampedFilename = (
  prefix: string,
  extension: string
): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${prefix}_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.${extension}`;
};

export const exportToCSV = (
  data: any,
  options: ExportOptions
): void => {
  // Filter records based on options
  const records = [];
  
  if (options.includeMatched) records.push(...(data.details.matched || []).map((r: any) => ({ ...r, Status: 'Matched' })));
  if (options.includePartial) records.push(...(data.details.partialMatch || []).map((r: any) => ({ ...r, Status: 'Partial Match' })));
  if (options.includeMismatched) records.push(...(data.details.mismatched || []).map((r: any) => ({ ...r, Status: 'Mismatched' })));
  if (options.includeMissingGST) records.push(...(data.details.missingInGST || []).map((r: any) => ({ ...r, Status: 'Missing in GST' })));
  if (options.includeMissingAPAR) records.push(...(data.details.missingInAPAR || []).map((r: any) => ({ ...r, Status: 'Missing in AP/AR' })));

  if (records.length === 0) {
    alert('No records to export with current filters!');
    return;
  }

  // Build CSV header
  let headers = ['Invoice_No', 'GSTIN', 'Status', 'GST_Amount', 'APAR_Amount', 'Difference'];
  
  if (options.includeConfidence) {
    headers.push('Confidence');
  }
  
  if (options.includeReasons) {
    headers.push('Reason');
  }

  headers.push('GST_Date', 'APAR_Date', 'Date_Mismatch', 'Date_Difference_Days');

  // Build CSV rows
  const csvRows = [headers.join(',')];
  
  records.forEach((record: any) => {
    const row = [
      `"${record.Invoice_No || ''}"`,
      `"${record.GSTIN || ''}"`,
      `"${record.Status || ''}"`,
      record.GST_Amount || '',
      record.APAR_Amount || '',
      record.Difference || 0,
    ];

    if (options.includeConfidence) {
      row.push(record.Confidence !== undefined ? (record.Confidence * 100).toFixed(0) + '%' : 'N/A');
    }

    if (options.includeReasons) {
      row.push(`"${(record.Reason || '').replace(/"/g, '""')}"`);
    }

    row.push(
      `"${record.GST_Date || ''}"`,
      `"${record.APAR_Date || ''}"`,
      record.Date_Mismatch ? 'Yes' : 'No',
      record.Date_Difference_Days || 0
    );

    csvRows.push(row.join(','));
  });

  // Create and download CSV
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', generateTimestampedFilename('Reconciliation_Report', 'csv'));
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = async (
  data: any,
  options: ExportOptions
): Promise<void> => {
  // Filter records
  const records = [];
  
  if (options.includeMatched) records.push(...(data.details.matched || []).map((r: any) => ({ ...r, Status: 'Matched' })));
  if (options.includePartial) records.push(...(data.details.partialMatch || []).map((r: any) => ({ ...r, Status: 'Partial Match' })));
  if (options.includeMismatched) records.push(...(data.details.mismatched || []).map((r: any) => ({ ...r, Status: 'Mismatched' })));
  if (options.includeMissingGST) records.push(...(data.details.missingInGST || []).map((r: any) => ({ ...r, Status: 'Missing in GST' })));
  if (options.includeMissingAPAR) records.push(...(data.details.missingInAPAR || []).map((r: any) => ({ ...r, Status: 'Missing in AP/AR' })));

  if (records.length === 0) {
    alert('No records to export with current filters!');
    return;
  }

  // Create HTML for PDF
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Reconciliation Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #1e40af;
          margin: 0;
          font-size: 28px;
        }
        .header .subtitle {
          color: #6b7280;
          margin-top: 5px;
        }
        .summary {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        .summary-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
        }
        .summary-card h3 {
          margin: 0;
          font-size: 24px;
          color: #1f2937;
        }
        .summary-card p {
          margin: 5px 0 0 0;
          font-size: 12px;
          color: #6b7280;
        }
        .matched { border-left: 4px solid #10b981; }
        .partial { border-left: 4px solid #f59e0b; }
        .mismatched { border-left: 4px solid #ef4444; }
        .missing-gst { border-left: 4px solid #8b5cf6; }
        .missing-apar { border-left: 4px solid #3b82f6; }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 11px;
        }
        th {
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          padding: 10px;
          text-align: left;
          font-weight: 600;
          color: #374151;
        }
        td {
          border: 1px solid #e5e7eb;
          padding: 8px;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
        }
        .status-matched { background-color: #d1fae5; color: #065f46; }
        .status-partial { background-color: #fed7aa; color: #92400e; }
        .status-mismatched { background-color: #fee2e2; color: #991b1b; }
        .status-missing-gst { background-color: #ede9fe; color: #5b21b6; }
        .status-missing-apar { background-color: #dbeafe; color: #1e40af; }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 11px;
        }
        .insights {
          margin: 30px 0;
          padding: 20px;
          background-color: #eff6ff;
          border-left: 4px solid #3b82f6;
          border-radius: 8px;
        }
        .insights h3 {
          margin-top: 0;
          color: #1e40af;
        }
        .insights ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .insights li {
          margin: 8px 0;
          color: #1f2937;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 GST vs AP/AR Reconciliation Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString()}</p>
      </div>

      <div class="summary">
        <div class="summary-card matched">
          <h3>${data.summary.matched}</h3>
          <p>Matched</p>
        </div>
        <div class="summary-card partial">
          <h3>${data.summary.partialMatch}</h3>
          <p>Partial Match</p>
        </div>
        <div class="summary-card mismatched">
          <h3>${data.summary.mismatched}</h3>
          <p>Mismatched</p>
        </div>
        <div class="summary-card missing-gst">
          <h3>${data.summary.missingInGST}</h3>
          <p>Missing in GST</p>
        </div>
        <div class="summary-card missing-apar">
          <h3>${data.summary.missingInAPAR}</h3>
          <p>Missing in AP/AR</p>
        </div>
      </div>

      <div class="insights">
        <h3>🤖 AI Insights</h3>
        <ul>
          ${data.insights.map((insight: string) => `<li>${insight}</li>`).join('')}
        </ul>
      </div>

      <h2 style="margin-top: 40px; color: #1f2937;">Detailed Records (${records.length} total)</h2>
      
      <table>
        <thead>
          <tr>
            <th>Invoice No</th>
            <th>GSTIN</th>
            <th>Status</th>
            <th>GST Amount</th>
            <th>AP/AR Amount</th>
            <th>Difference</th>
            ${options.includeConfidence ? '<th>Confidence</th>' : ''}
            ${options.includeReasons ? '<th>Reason</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${records.map((record: any) => `
            <tr>
              <td>${record.Invoice_No || 'N/A'}</td>
              <td style="font-family: monospace; font-size: 10px;">${record.GSTIN || 'N/A'}</td>
              <td>
                <span class="status-badge status-${record.Status.toLowerCase().replace(/ /g, '-')}">
                  ${record.Status}
                </span>
              </td>
              <td style="text-align: right;">₹${(record.GST_Amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">₹${(record.APAR_Amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right; color: ${(record.Difference || 0) > 0 ? '#dc2626' : '#16a34a'}; font-weight: 600;">
                ₹${(record.Difference || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              ${options.includeConfidence ? `<td style="text-align: center;">${record.Confidence !== undefined ? (record.Confidence * 100).toFixed(0) + '%' : 'N/A'}</td>` : ''}
              ${options.includeReasons ? `<td style="font-size: 10px;">${record.Reason || 'N/A'}</td>` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p><strong>AI-Powered Financial Reconciliation System</strong></p>
        <p>Match Rate: ${data.summary.matchRate}% | Total Records: ${data.summary.matched + data.summary.partialMatch + data.summary.mismatched + data.summary.missingInGST + data.summary.missingInAPAR}</p>
        <p>This report was generated automatically. Please verify critical data before making financial decisions.</p>
      </div>
    </body>
    </html>
  `;

  // Create blob and download
  const blob = new Blob([html], { type: 'text/html' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', generateTimestampedFilename('Reconciliation_Report', 'html'));
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Show instructions
  setTimeout(() => {
    alert('HTML report downloaded! Open it in your browser and use Print → Save as PDF to create a PDF file.');
  }, 500);
};