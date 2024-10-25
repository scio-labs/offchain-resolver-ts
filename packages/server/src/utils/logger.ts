enum LogLevel {
  SILENT = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

class Logger {
  private static instance: Logger
  private currentLogLevel: LogLevel = LogLevel.INFO

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) Logger.instance = new Logger()
    return Logger.instance
  }

  public setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level
  }

  public debug(...args: any[]): void {
    if (this.currentLogLevel >= LogLevel.DEBUG) {
      console.log(...args)
    }
  }

  public info(...args: any[]): void {
    if (this.currentLogLevel >= LogLevel.INFO) {
      console.log(...args)
    }
  }

  public warn(...args: any[]): void {
    if (this.currentLogLevel >= LogLevel.WARN) {
      console.warn(...args)
    }
  }

  public error(...args: any[]): void {
    console.error(...args)
  }
}

export default Logger
