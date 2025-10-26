/**
 * UI-specific types for Master Dashboard
 * These types decouple UI components from Supabase schema complexity
 */

export interface MasterMetricsUI {
  healthRate: number;
  activeChannels: number;
  aiMappingRate: number;
  duplicateRate: number;
  qaPassRate: number;
  errorRate: number;
  isMock: boolean;
}

export interface TrendPointUI {
  timestamp: string;
  value: number;
  label?: string;
}

export interface QAReportUI {
  id: string;
  title: string | null;
  status: string;
  category: string | null;
  generatedAt: string;
  totalAnomalies: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  summary: string | null;
  aiRecommendations: string | null;
}

export interface ErrorLogUI {
  id: string;
  module: string;
  level: "critical" | "warning" | "info";
  message: string;
  createdAt: string;
}

export interface AIInsightUI {
  id: string;
  detectedAt: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
}

export interface SystemHealthUI {
  totalReports: number;
  successRate: number;
  avgProcessingTime: number;
  warningCount: number;
}
