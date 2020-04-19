import { Level, Metadata, Pipes, Record } from './record';

export * from './record';
export * from './caller';

export const $metadata = Symbol('metadata');

Record.fromFileName = __filename;

export type ConsoleOverrideMethods = 'log' | 'info' | 'error' | 'dir' | 'warn' | 'debug' | 'trace';

export default class Valera {
	static readonly CONSOLE_METHODS_KEYS: ConsoleOverrideMethods[] = ['log', 'info', 'error', 'dir', 'warn', 'debug', 'trace'];
	static readonly CONSOLE_METHODS: { [methodName: string]: (...args: any[]) => void } = {};

	static logname?: string | undefined;
	static readonly metadata: Metadata = {};
	static readonly pipes: Pipes = {};
	static readonly formats: string[] = [];
	static handler(this: ValeraOptions, record: Record): void {}

	private static handle(instance: ValeraInstance, level: Level, args: any[]): void {
		const metadata = this.getMetadata(instance);
		const { logname, formats, pipes, handler } = instance;
		Record.lineLength = process.stdout.columns;

		const record: Record = new Record(logname, formats, pipes, metadata, level, args);
		handler.call({
			logname,
			formats,
			pipes,
			metadata,
		} as ValeraOptions, record);
	}

	private static getMetadata(instance?: ValeraInstance): Metadata {
		if (!instance || instance === (this as any)) {
			return { ...this.metadata };
		}

		return {
			...this.metadata,
			...instance.metadata,
			...(instance as any)[$metadata],
		};
	}

	static configure(options: ValeraOptions): void {
		if (typeof options === 'object' && options !== null) {
			if (options.name) Valera.logname = options.name;

			if (Array.isArray(options.formats)) Valera.formats.splice(0, Valera.formats.length, ...options.formats);

			if (options.pipes && typeof options.pipes === 'object') Object.assign(Valera.pipes, options.pipes);

			if (options.metadata && typeof options.metadata === 'object') Object.assign(Valera.metadata, options.metadata);

			if (typeof options.handler === 'function') Valera.handler = options.handler;
		}
	}

	static overrideConsole(): void {
		Object.defineProperty(console, 'logger', {
			value: Valera,
			writable: false,
		});

		for (const m of this.CONSOLE_METHODS_KEYS) {
			console[m] = Valera[m].bind(Valera);
		}

		console.meta = (metadata: Metadata): Valera => Valera.meta(metadata);

		console.name = (name: string): Valera => Valera.useName(name);

		process.on('uncaughtException', err => {
			Valera.critical(err);
			process.exit(0);
		});
	}

	static useName(name: string): Valera {
		return new Valera({ name });
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

	readonly logname?: string;
	readonly [$metadata]: Metadata = {};
	readonly metadata: Metadata = {};
	readonly pipes: Pipes = {};
	readonly formats: string[] = [];

	constructor(options?: ValeraOptions) {
		if (typeof options === 'object' && options !== null) {
			if (options.name) {
				this.logname = options.name;
			} else {
				this.logname = Valera.logname;
			}

			if (Array.isArray(options.formats)) {
				this.formats.splice(0, this.formats.length, ...options.formats);
			} else {
				this.formats.splice(0, this.formats.length, ...Valera.formats);
			}

			if (options.pipes && typeof options.pipes === 'object') {
				Object.assign(this.pipes, options.pipes);
			} else {
				Object.assign(this.pipes, Valera.pipes);
			}

			if (options.metadata && typeof options.metadata === 'object') {
				Object.assign(this.metadata, options.metadata);
			} else {
				Object.assign(this.metadata, Valera.metadata);
			}

			if (typeof options.handler === 'function') {
				this.handler = options.handler;
			} else {
				this.handler = Valera.handler;
			}
		} else {
			this.logname = Valera.logname;
			this.formats.splice(0, this.formats.length, ...Valera.formats);
			Object.assign(this.pipes, Valera.pipes);
			Object.assign(this.metadata, Valera.metadata);
			this.handler = Valera.handler;
		}
	}

	handler(this: ValeraOptions, record: Record): void {}

	name(name: string): Valera {
		const logger = this.clone();
		Object.defineProperty(logger, 'logname', {
			value: name,
			writable: false,
		});

		return logger;
	}

	meta(metadata: Metadata): void {
		Object.assign(this[$metadata], metadata || {});
	}

	clone(): Valera {
		const logger = new Valera({
			name: this.logname,
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

declare global {
	interface Console {
		logger: typeof Valera;
		meta(metadata: Metadata): Valera;
		name(name: string): Valera;
	}
}

export type ValeraInstance = (Valera | typeof Valera);

export interface ValeraOptions {
	name?: string;
	metadata?: Metadata;
	formats?: string[];
	pipes?: Pipes;
	handler?(this: ValeraOptions, record: Record): void;
}

for (const m of Valera.CONSOLE_METHODS_KEYS) {
	Object.defineProperty(Valera.CONSOLE_METHODS, m, {
		value: console[m],
		writable: false,
	});
}
