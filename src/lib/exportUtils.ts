/**
 * Phase 3.11: Export Utilities
 * Provides functions for exporting QA reports and logs
 */

export function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateQAReportPDF(report: any): string {
  // Convert report to formatted text for PDF
  const content = `
SympoHub QA Report
Generated: ${new Date(report.generated_at).toLocaleString('ko-KR')}

===========================================

Summary:
${report.summary}

Statistics:
- Total Anomalies: ${report.total_anomalies}
- Critical: ${report.critical_count}
- Warning: ${report.warning_count}
- Info: ${report.info_count}

AI Recommendations:
${report.ai_recommendations || 'No recommendations available'}

===========================================

Full Report Data:
${JSON.stringify(report.report_json, null, 2)}
`;

  return content;
}

export function downloadTextAsPDF(content: string, filename: string) {
  // For now, download as text file
  // In production, integrate with a PDF library like jsPDF
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.replace('.pdf', '.txt');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
