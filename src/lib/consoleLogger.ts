/**
 * Phase 3.10-A: Standardized Console Logger
 * 
 * Provides consistent log prefixes and filtering
 * - [SYS] System cache updated
 * - [UI] Fallback to cached data
 * - [RLS] Scope enforcement OK
 * - [RT] Realtime channel closed
 */

type LogLevel = "log" | "warn" | "error";
type LogPrefix = "SYS" | "UI" | "RLS" | "RT" | "DB" | "API";

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel[];
  prefixes: LogPrefix[];
}

// Production mode: only errors
// Development mode: all logs
const config: LoggerConfig = {
  enabled: import.meta.env.DEV || false,
  level: import.meta.env.PROD ? ["error"] : ["log", "warn", "error"],
  prefixes: ["SYS", "UI", "RLS", "RT", "DB", "API"],
};

export class Logger {
  private static shouldLog(level: LogLevel, prefix: LogPrefix): boolean {
    if (!config.enabled) return false;
    if (!config.level.includes(level)) return false;
    if (!config.prefixes.includes(prefix)) return false;
    return true;
  }

  static log(prefix: LogPrefix, message: string, ...args: any[]) {
    if (!this.shouldLog("log", prefix)) return;
    console.log(`[${prefix}] ${message}`, ...args);
  }

  static warn(prefix: LogPrefix, message: string, ...args: any[]) {
    if (!this.shouldLog("warn", prefix)) return;
    console.warn(`[${prefix}] ${message}`, ...args);
  }

  static error(prefix: LogPrefix, message: string, ...args: any[]) {
    if (!this.shouldLog("error", prefix)) return;
    console.error(`[${prefix}] ${message}`, ...args);
  }
}

// Convenience exports
export const logSys = (msg: string, ...args: any[]) => Logger.log("SYS", msg, ...args);
export const logUI = (msg: string, ...args: any[]) => Logger.log("UI", msg, ...args);
export const logRLS = (msg: string, ...args: any[]) => Logger.log("RLS", msg, ...args);
export const logRT = (msg: string, ...args: any[]) => Logger.log("RT", msg, ...args);
export const logDB = (msg: string, ...args: any[]) => Logger.log("DB", msg, ...args);
export const logAPI = (msg: string, ...args: any[]) => Logger.log("API", msg, ...args);

export const warnSys = (msg: string, ...args: any[]) => Logger.warn("SYS", msg, ...args);
export const warnUI = (msg: string, ...args: any[]) => Logger.warn("UI", msg, ...args);
export const warnRLS = (msg: string, ...args: any[]) => Logger.warn("RLS", msg, ...args);

export const errorSys = (msg: string, ...args: any[]) => Logger.error("SYS", msg, ...args);
export const errorUI = (msg: string, ...args: any[]) => Logger.error("UI", msg, ...args);
export const errorDB = (msg: string, ...args: any[]) => Logger.error("DB", msg, ...args);
export const errorAPI = (msg: string, ...args: any[]) => Logger.error("API", msg, ...args);
