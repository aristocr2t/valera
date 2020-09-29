import { Caller } from './caller';

export interface Metadata {
	[key: string]: any;
}

export type Level = 'debug' | 'info' | 'warn' | 'error' | 'critical' | 'verbose' | 'trace';

export interface Message {
	args: any[];
	caller: Caller;
	date: number;
	level: Level;
	metadata: Metadata;
	name: string | undefined;
}

export interface Pipes {
	[key: string]: (...args: any[]) => string;
}

export class Record {
	static formatReplaceMask = /\{\{\s*([a-zA-Z_$][0-9a-zA-Z_$]+)(?:\s*\|\s*([a-zA-Z_$][0-9a-zA-Z_$]+))?\s*\}\}/g;
	// eslint-disable-next-line no-control-regex
	static ansiColorsReplaceMask = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
	static fromFileName: string = __filename;
	static separator: string = '<-|->';
	static lineLength: number = 0;

	static printWithN(parts: string[]): string {
		for (let i = 0, iNext = 1, len = parts.length - 1, sln: number; i < len; i += 2, iNext += 2) {
			sln = this.lineLength - parts[iNext].length;
			parts[i] += sln > 0 ? `\n${' '.repeat(this.lineLength - parts[iNext].length)}` : '\n';
		}

		return parts.join('');
	}

	readonly caller: Caller;

	constructor(
		public readonly name: string | undefined,
		public readonly formats: string[],
		public readonly pipes: Pipes,
		public readonly metadata: Metadata,
		public readonly level: Level,
		public readonly args: any[],
		public readonly date: number = Date.now(),
	) {
		this.caller = Caller.get(Record.fromFileName);
	}

	messages(): string[] {
		if (!Array.isArray(this.formats)) {
			return [];
		}

		return this.formats.map((f) => {
			if (f === 'json') {
				const cache: any[] = [];
				const jsonMessage = this.toMessage();
				const out = JSON.stringify(jsonMessage, (key, value) => {
					if (typeof value === 'object' && value) {
						if (cache.includes(value)) {
							return `[circular ${key}]`;
						}

						cache.push(value);
					}

					return value;
				});

				return out;
			}

			const stringMessage = f.replace(Record.formatReplaceMask, (_: string, propName: string, pipeName: string) => {
				const prop = (this as {[ key: string]: any })[propName];

				if (pipeName !== undefined) {
					const pipe = this.pipes[pipeName];

					if (typeof pipe !== 'function') {
						throw new TypeError(`Pipe property "${pipeName}" is not a function`);
					}

					return pipe(prop);
				}

				return prop;
			});

			if (Record.separator && stringMessage.includes(Record.separator)) {
				if (Record.lineLength > 0) {
					const parts = stringMessage.split(Record.separator);

					if (stringMessage.includes('\n')) {
						return Record.printWithN(parts);
					}

					const cleanMessage = stringMessage.replace(Record.ansiColorsReplaceMask, '');
					const seps = parts.length - 1;
					const sl = Record.lineLength - ((cleanMessage || '').length - (seps * Record.separator.length));

					if (sl > 0 && sl % seps !== 0) {
						for (let i = 0, len = parts.length; i < len; i += seps) parts[i] += ' ';
					}

					return sl > 0 ? parts.join(' '.repeat(Math.floor(sl / seps))) : Record.printWithN(parts);
				}

				return stringMessage.split(Record.separator).join('\n');
			}

			return stringMessage;
		});
	}

	toMessage(): Message {
		return {
			args: this.args || [],
			caller: this.caller,
			date: this.date,
			level: this.level,
			metadata: this.metadata || {},
			name: this.name,
		};
	}
}
