import chalk from 'chalk';
import cluster from 'cluster';
import { createWriteStream, existsSync, mkdirSync, renameSync, statSync } from 'fs';
import moment from 'moment';
import { dirname, resolve as pathResolve } from 'path';
import { Writable } from 'stream';
import { inspect } from 'util';

export class Caller {
  static get(fromFileName: string): Caller {
    const origPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = (e, s) => s;
    const err = new Error();
    let callerfile = null;
    let cs: NodeJS.CallSite;
    for (let i = 1, foundFromFilename: boolean = false; i < err.stack.length; i++) {
      callerfile = ((err.stack[i] as any) as NodeJS.CallSite).getFileName();
      if (callerfile === fromFileName) foundFromFilename = true;
      else if (foundFromFilename && fromFileName !== callerfile) {
        cs = (err.stack[i] as any) as NodeJS.CallSite;
        break;
      }
    }
    Error.prepareStackTrace = origPrepareStackTrace;
    return new Caller(cs);
  }

  readonly fileName: string;
  readonly methodName: string;
  readonly functionName: string;
  readonly typeName: string;
  readonly line: number;
  readonly column: number;
  readonly evalOrigin: string;
  readonly isToplevel: boolean;
  readonly isEval: boolean;
  readonly isNative: boolean;
  readonly isConstructor: boolean;

  constructor(cs: NodeJS.CallSite) {
    if (cs) {
      this.fileName = cs.getFileName();
      this.methodName = cs.getMethodName();
      this.functionName = cs.getFunctionName();
      this.typeName = cs.getTypeName();
      this.line = cs.getLineNumber();
      this.column = cs.getColumnNumber();
      this.evalOrigin = cs.getEvalOrigin();
      this.isToplevel = cs.isToplevel();
      this.isEval = cs.isEval();
      this.isNative = cs.isNative();
      this.isConstructor = cs.isConstructor();
    } else {
      this.fileName = null;
      this.methodName = null;
      this.functionName = null;
      this.typeName = null;
      this.line = 0;
      this.column = 0;
      this.evalOrigin = null;
      this.isToplevel = false;
      this.isEval = false;
      this.isNative = false;
      this.isConstructor = false;
    }
  }
}

export type LogType = 'debug' | 'info' | 'warn' | 'error' | 'critical' | 'verbose' | 'trace';
export class Record {
  logType: LogType;
  date: number;
  args: any[];
  caller: Caller;

  constructor(logType: LogType, args: any[]) {
    this.date = Date.now();
    this.logType = logType;
    this.caller = Caller.get(__filename);
    this.args = args;
  }
}

export interface ValeraOptions {
  instanceId?: string;
  rootPath?: string;
  streams?: { [name: string]: (this: ValeraOptions) => Writable };
  openedStreams?: { [name: string]: Writable };
  disabledPaths?: string[];
  handler?(record: Record): void;
}

const COLORS = {
  date: chalk.cyan,
  pid: chalk.white,
  instanceId: chalk.magentaBright,
  logType: {
    trace: chalk.blue,
    verbose: chalk.magenta,
    debug: chalk.cyan,
    info: chalk.green,
    warn: chalk.yellow,
    error: chalk.red,
    critical: chalk.red,
  },
  fileName: chalk.gray,
};

export default class Valera {
  static readonly methods = ['log', 'info', 'error', 'dir', 'warn', 'debug', 'trace'];
  static console: { [methodName: string]: (message?: any, ...optionalParams: any[]) => void } = {};
  static terminalSize: { columns: number; rows: number } = { columns: process.stdout.columns || 100, rows: process.stdout.rows || 20 };

  private static options: ValeraOptions = {
    instanceId: null,
    rootPath: dirname(require.main.filename),
    disabledPaths: [],
    openedStreams: {},
    streams: {
      terminal(this: ValeraOptions) {
        return process.stdout;
      },
      terminal_error(this: ValeraOptions) {
        return process.stderr;
      },
      file(this: ValeraOptions) {
        if (this.openedStreams.file) return this.openedStreams.file;
        const logsPath = pathResolve(this.rootPath, 'logs');
        if (!existsSync(logsPath)) mkdirSync(logsPath, { recursive: true });
        const logPath = pathResolve(logsPath, 'all.log');
        if (existsSync(logPath)) {
          const stat = statSync(logPath);
          if (stat.size) {
            renameSync(logPath, pathResolve(dirname(logPath), 'all_' + moment(stat.birthtime).format('YYYYMMDDHHmmss') + '.log'));
          }
        }
        return createWriteStream(logPath);
      },
      file_error(this: ValeraOptions) {
        if (this.openedStreams.file_error) return this.openedStreams.file_error;
        const logsPath = pathResolve(this.rootPath, 'logs');
        if (!existsSync(logsPath)) mkdirSync(logsPath, { recursive: true });
        const logPath = pathResolve(logsPath, 'error.log');
        if (existsSync(logPath)) {
          const stat = statSync(logPath);
          if (stat.size) {
            renameSync(logPath, pathResolve(dirname(logPath), 'error_' + moment(stat.birthtime).format('YYYYMMDDHHmmss') + '.log'));
          }
        }
        return createWriteStream(logPath);
      },
    },
    handler(this: ValeraOptions, record: Record): void {
      if (this.disabledPaths.some(p => record.caller.fileName.startsWith(p))) return;
      const date = moment(record.date).format('YYYY-MM-DD HH:mm:ss.SSS');
      const pid = `[${cluster.isMaster ? '0' : cluster.worker.id}:${process.pid}]`;
      const instanceId = this.instanceId || null;
      const logType = record.logType.toUpperCase();
      const caller = record.caller;
      const coloredData =
        ' ' +
        record.args
          .map(x => {
            if (typeof x === 'string') {
              return x;
            } else if (x instanceof Error) {
              return x.stack;
            }
            return inspect(x, false, null, true);
          })
          .join(' ');
      const data = coloredData.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
      const cleanMessage = date + ' ' + pid + ' ' + logType + (instanceId ? ` <${instanceId}>` : '');
      const cleanMessageWithData = cleanMessage + data;
      const fileName = caller.fileName
        ? `${caller.fileName.startsWith(this.rootPath) ? '.' + caller.fileName.substring(this.rootPath.length) : caller.fileName}:${
            caller.line
          }:${caller.column}`
        : '';
      const linebreak = cleanMessageWithData.includes('\n') || cleanMessageWithData.length >= Valera.terminalSize.columns;
      const coloredMessage =
        COLORS.date(date) +
        ' ' +
        COLORS.pid(pid) +
        ' ' +
        COLORS.logType[record.logType](logType) +
        (instanceId ? ` ${COLORS.instanceId(`<${instanceId}>`)}` : '') +
        coloredData;
      if (['error', 'critical'].includes(record.logType)) {
        this.openedStreams.terminal_error.write(coloredMessage);
        if (!linebreak) {
          (this.openedStreams.terminal_error as NodeJS.WriteStream).cursorTo(Valera.terminalSize.columns - fileName.length);
          this.openedStreams.terminal_error.write(COLORS.fileName(fileName) + '\n');
        } else {
          this.openedStreams.terminal_error.write('\n' + COLORS.fileName(fileName) + '\n');
        }
        this.openedStreams.file_error.write(cleanMessage + ` ${caller.fileName}:${caller.line}:${caller.column}` + data + '\n');
        this.openedStreams.file.write(cleanMessage + ` ${caller.fileName}:${caller.line}:${caller.column}` + data + '\n');
      } else {
        this.openedStreams.terminal.write(coloredMessage);
        if (!linebreak) {
          (this.openedStreams.terminal as NodeJS.WriteStream).cursorTo(Valera.terminalSize.columns - fileName.length);
          this.openedStreams.terminal.write(COLORS.fileName(fileName) + '\n');
        } else {
          this.openedStreams.terminal.write('\n' + COLORS.fileName(fileName) + '\n');
        }
        this.openedStreams.file.write(cleanMessage + ` ${caller.fileName}:${caller.line}:${caller.column}` + data + '\n');
      }
    },
  };

  static configure(options: ValeraOptions): void {
    if (options) {
      options.streams = Object.assign({}, this.options.streams, options.streams || {});
    }
    this.options = Object.assign({}, this.options, options);
    for (const name in this.options.streams) {
      if (this.options.streams.hasOwnProperty(name)) {
        this.options.openedStreams[name] = this.options.streams[name].call(this.options);
      }
    }
  }

  static overrideConsole(options: ValeraOptions = this.options): void {
    const logger = new Valera(options);
    for (const m of this.methods) {
      // tslint:disable-next-line: only-arrow-functions
      console[m] = function() {
        return logger[m].apply(logger, arguments);
      };
    }
  }

  constructor(private readonly options: ValeraOptions = Valera.options) {
    if (this.options) {
      this.options.streams = Object.assign({}, Valera.options.streams, this.options.streams || {});
    }
    this.options = Object.assign({}, Valera.options, this.options);
    for (const name in this.options.streams) {
      if (this.options.streams.hasOwnProperty(name)) {
        this.options.openedStreams[name] = this.options.streams[name].call(this.options);
      }
    }
  }

  log(message?: any, ...optionalParams: any[]): void {
    this.handle('debug', message, ...optionalParams);
  }

  debug(message?: any, ...optionalParams: any[]): void {
    this.handle('debug', message, ...optionalParams);
  }

  info(message?: any, ...optionalParams: any[]): void {
    this.handle('info', message, ...optionalParams);
  }

  warn(message?: any, ...optionalParams: any[]): void {
    this.handle('warn', message, ...optionalParams);
  }

  trace(message?: any, ...optionalParams: any[]): void {
    this.handle('trace', message, ...optionalParams);
  }

  error(message?: any, ...optionalParams: any[]): void {
    this.handle('error', message, ...optionalParams);
  }

  critical(message?: any, ...optionalParams: any[]): void {
    this.handle('critical', message, ...optionalParams);
  }

  dir(value?: any, ...optionalParams: any[]): void {
    this.handle('verbose', value, ...optionalParams);
  }

  private handle(type: LogType, ...args: any[]): void {
    const record: Record = new Record(type, args);
    this.options.handler.call(this.options, record);
  }
}

for (const m of Valera.methods) {
  Object.defineProperty(Valera.console, m, { value: console[m], writable: false });
}

process.stdout.on('resize', () => {
  Valera.terminalSize.columns = process.stdout.columns || 100;
  Valera.terminalSize.rows = process.stdout.rows || 20;
});
