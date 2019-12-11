import { Level, Metadata, Pipes, Record } from './record';

export * from './record';
export * from './caller';

declare global {
  interface Console {
    logger: Valera;
    meta(metadata: Metadata): Valera;
    setId(name: string): Valera;
  }
}

export interface ValeraOptions {
  name?: string;
  metadata?: Metadata;
  formats?: string[];
  pipes?: Pipes;
  handler?(this: ValeraOptions, record: Record): void;
}

export const $metadata = Symbol('metadata');

Record.fromFileName = __filename;

export type ValeraInstance = Valera | ((new () => Valera) & ValeraOptions);

export default class Valera {
  static readonly CONSOLE_METHODS_KEYS: Array<keyof Console> = ['log', 'info', 'error', 'dir', 'warn', 'debug', 'trace'];
  static readonly CONSOLE_METHODS: { [methodName: string]: (...args: any[]) => void } = {};
  // @ts-ignore
  static name: string;
  static readonly metadata: Metadata = {};
  static readonly pipes: Pipes = {};
  static readonly formats: string[] = [];
  static handler(this: ValeraOptions, record: Record): void {}

  private static handle(instance: ValeraInstance, level: Level, args: any[]): void {
    const metadata = this.getMetadata(instance);
    const { name, formats, pipes, handler } = instance;
    Record.lineLength = process.stdout.columns;
    const record: Record = new Record(instance.name, formats, pipes, metadata, level, args);
    handler.call({ name, formats, pipes, metadata }, record);
  }

  private static getMetadata(instance?: ValeraInstance): Metadata {
    if (!instance || this === instance) return Object.assign({}, this.metadata);
    return Object.assign({}, this.metadata, instance.metadata, instance[$metadata]);
  }

  static configure(options: ValeraOptions): void {
    if (typeof options === 'object' && options !== null) {
      if (options.name) Object.defineProperty(Valera, 'name', { value: options.name, writable: false });
      if (Array.isArray(options.formats)) Valera.formats.splice(0, Valera.formats.length, ...options.formats);
      if (options.pipes && typeof options.pipes === 'object') Object.assign(Valera.pipes, options.pipes);
      if (options.metadata && typeof options.metadata === 'object') Object.assign(Valera.metadata, options.metadata);
      if (typeof options.handler === 'function') Valera.handler = options.handler;
    }
  }

  static overrideConsole(options?: ValeraOptions): void {
    const logger = new Valera(options);
    Object.defineProperty(console, 'logger', { value: logger, writable: false });
    for (const m of this.CONSOLE_METHODS_KEYS) {
      // tslint:disable-next-line: only-arrow-functions
      console[m] = function() {
        return logger[m].apply(logger, arguments);
      };
    }
    // tslint:disable-next-line: only-arrow-functions
    console.meta = function(metadata: Metadata): Valera {
      return console.logger.meta(metadata);
    };
    // tslint:disable-next-line: only-arrow-functions
    console.setId = function(name: string): Valera {
      return console.logger.setId(name);
    };

    process.on('uncaughtException', err => {
      logger.critical(err);
      process.exit(0);
    });
  }

  static setId(name: string): Valera {
    const logger = new Valera();
    logger.name = name;
    return logger;
  }

  static meta(metadata: Metadata): Valera {
    const logger = new Valera();
    Object.assign(logger[$metadata], metadata || {});
    return logger;
  }

  static log(...args: any[]): void {
    this.handle(this, 'debug', args);
  }

  static debug(...args: any[]): void {
    this.handle(this, 'debug', args);
  }

  static info(...args: any[]): void {
    this.handle(this, 'info', args);
  }

  static warn(...args: any[]): void {
    this.handle(this, 'warn', args);
  }

  static trace(...args: any[]): void {
    this.handle(this, 'trace', args);
  }

  static error(...args: any[]): void {
    this.handle(this, 'error', args);
  }

  static critical(...args: any[]): void {
    this.handle(this, 'critical', args);
  }

  static dir(...args: any[]): void {
    this.handle(this, 'verbose', args);
  }

  name: string;
  readonly [$metadata]: Metadata = {};
  readonly metadata: Metadata = {};
  readonly pipes: Pipes = {};
  readonly formats: string[] = [];
  handler(this: ValeraOptions, record: Record): void {}

  constructor(options?: ValeraOptions) {
    if (typeof options === 'object' && options !== null) {
      if (options.name) this.name = options.name;
      else this.name = Valera.name;
      if (Array.isArray(options.formats)) this.formats.splice(0, this.formats.length, ...options.formats);
      else this.formats.splice(0, this.formats.length, ...Valera.formats);
      if (options.pipes && typeof options.pipes === 'object') Object.assign(this.pipes, options.pipes);
      else Object.assign(this.pipes, Valera.pipes);
      if (options.metadata && typeof options.metadata === 'object') Object.assign(this.metadata, options.metadata);
      else Object.assign(this.metadata, Valera.metadata);
      if (typeof options.handler === 'function') this.handler = options.handler;
      else this.handler = Valera.handler;
    } else {
      this.name = Valera.name;
      this.formats.splice(0, this.formats.length, ...Valera.formats);
      Object.assign(this.pipes, Valera.pipes);
      Object.assign(this.metadata, Valera.metadata);
      this.handler = Valera.handler;
    }
  }

  setId(name: string): Valera {
    const logger = this.clone();
    logger.name = name;
    return logger;
  }

  meta(metadata: Metadata): Valera {
    const logger = this.clone();
    Object.assign(logger[$metadata], metadata || {});
    return logger;
  }

  clone(): Valera {
    const logger = new Valera({
      name: this.name,
      metadata: this.metadata,
      formats: this.formats,
      pipes: this.pipes,
      handler: this.handler,
    });
    Object.assign(logger[$metadata], this[$metadata]);
    return logger;
  }

  log(...args: any[]): void {
    Valera.handle(this, 'debug', args);
  }

  debug(...args: any[]): void {
    Valera.handle(this, 'debug', args);
  }

  info(...args: any[]): void {
    Valera.handle(this, 'info', args);
  }

  warn(...args: any[]): void {
    Valera.handle(this, 'warn', args);
  }

  trace(...args: any[]): void {
    Valera.handle(this, 'trace', args);
  }

  error(...args: any[]): void {
    Valera.handle(this, 'error', args);
  }

  critical(...args: any[]): void {
    Valera.handle(this, 'critical', args);
  }

  dir(...args: any[]): void {
    Valera.handle(this, 'verbose', args);
  }
}
Object.defineProperty(Valera, 'name', { value: null, writable: false });
for (const m of Valera.CONSOLE_METHODS_KEYS) {
  Object.defineProperty(Valera.CONSOLE_METHODS, m, { value: console[m], writable: false });
}
