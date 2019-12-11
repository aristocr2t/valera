import { Level, Meta, Pipes, Record } from './record';

export * from './record';
export * from './caller';

declare global {
  interface Console {
    logger: Valera;
    meta(meta: Meta): Valera;
  }
}

export interface ValeraOptions {
  name?: string;
  meta?: Meta;
  formats?: string[];
  pipes?: Pipes;
  handler?(this: ValeraOptions, record: Record): void;
}

export const $meta = Symbol('meta');

Record.fromFileName = __filename;

export default class Valera {
  static readonly CONSOLE_METHODS_KEYS: Array<keyof Console> = ['log', 'info', 'error', 'dir', 'warn', 'debug', 'trace'];
  static readonly CONSOLE_METHODS: { [methodName: string]: (message?: any, ...optionalParams: any[]) => void } = {};

  private static readonly options: ValeraOptions = {
    name: null,
    meta: {},
    pipes: {},
    formats: [],
    handler(this: ValeraOptions, record: Record): void {},
  };

  static configure(options: ValeraOptions): void {
    if (typeof options === 'object' && options !== null) {
      if (!options.name) options.name = Valera.options.name;
      if (!Array.isArray(options.formats)) options.formats = Valera.options.formats;
      if (!options.pipes || typeof options.pipes !== 'object') options.pipes = Valera.options.pipes;
      if (!options.meta || typeof options.meta !== 'object') options.meta = Valera.options.meta;
      if (typeof options.handler !== 'function') options.handler = Valera.options.handler;
      Object.assign(Valera.options, options);
    }
  }

  static overrideConsole(options?: ValeraOptions): void {
    const logger = new Valera(options || this.options);
    Object.defineProperty(console, 'logger', { value: logger, writable: false });
    for (const m of this.CONSOLE_METHODS_KEYS) {
      // tslint:disable-next-line: only-arrow-functions
      console[m] = function() {
        return logger[m].apply(logger, arguments);
      };
    }
    // tslint:disable-next-line: only-arrow-functions
    console.meta = function(meta: Meta): Valera {
      return console.logger.meta(meta);
    };

    process.on('uncaughtException', err => {
      logger.critical(err);
      process.exit(0);
    });
  }

  constructor(private readonly options?: ValeraOptions) {
    if (typeof options !== 'object' || options === null) {
      options = Object.assign({}, Valera.options);
    } else {
      if (!options.name) options.name = Valera.options.name;
      if (!Array.isArray(options.formats)) options.formats = Valera.options.formats;
      if (!options.pipes || typeof options.pipes !== 'object') options.pipes = Valera.options.pipes;
      if (!options.meta || typeof options.meta !== 'object') options.meta = Valera.options.meta;
      if (typeof options.handler !== 'function') options.handler = Valera.options.handler;
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

  meta(meta: Meta): Valera {
    const logger = this.clone();
    logger[$meta] = Object.assign({}, logger[$meta] || {}, meta || {});
    return logger;
  }

  clone(): Valera {
    const logger = new Valera(this.options);
    logger[$meta] = Object.assign({}, this[$meta] || {});
    return logger;
  }

  private getMeta(): Meta {
    return Object.assign({}, Valera.options.meta, this.options.meta, this[$meta] || {});
  }

  private handle(level: Level, ...args: any[]): void {
    const meta = this.getMeta();
    const { name, formats, pipes, handler } = this.options;
    Record.lineLength = process.stdout.columns;
    const record: Record = new Record(name, formats, pipes, meta, level, args);
    handler.call(this.options, record);
  }
}

for (const m of Valera.CONSOLE_METHODS_KEYS) {
  Object.defineProperty(Valera.CONSOLE_METHODS, m, { value: console[m], writable: false });
}
