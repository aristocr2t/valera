import { inspect } from 'util';

import { Caller } from './caller';

export type Metadata = { [key: string]: any };

export type Level = 'debug' | 'info' | 'warn' | 'error' | 'critical' | 'verbose' | 'trace';

export interface Message {
  date: string;
  level: Level;
  name: string;
  file: string;
  metadata: Metadata;
  args: any[];
}

export type Pipes = { [key: string]: (v: any) => string };

export class Record {
  static formatReplaceMask = /\{%(.*?)%\}/g;
  static ansiColorsReplaceMask = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
  static fromFileName: string = __filename;
  static separator: string = '<-|->';
  static lineLength: number = 0;

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
    if (Array.isArray(this.formats)) {
      return this.formats.map(f => {
        if (f === 'json') {
          let cache = [];
          const out = JSON.stringify(this.toMessage(), (key, value) => {
            if (typeof value === 'object' && value !== null) {
              if (cache.indexOf(value) !== -1) {
                return `[circular ${key}]`;
              }
              cache.push(value);
            }
            return value;
          });
          cache = null;
          return out;
        } else if (f === 'inspect') {
          return inspect(this.toMessage(), false, null, false);
        }
        const message = f.replace(Record.formatReplaceMask, (r, q, i, s) => {
          const fn = new Function('with(this){return(' + q + ');}') as (this: Record) => string;
          return fn.call(this);
        });
        if (Record.separator && message.includes(Record.separator)) {
          if (Record.lineLength > 0) {
            const parts = message.split(Record.separator);
            if (message.includes('\n')) {
              return printWithN(parts);
            } else {
              const cleanMessage = message.replace(Record.ansiColorsReplaceMask, '');
              const seps = parts.length - 1;
              const sl = Record.lineLength - ((cleanMessage || '').length - seps * Record.separator.length);
              if (sl > 0 && sl % seps !== 0) {
                for (let i = 0, len = parts.length; i < len; i += seps) parts[i] += ' ';
              }
              return sl > 0 ? parts.join(' '.repeat(Math.floor(sl / seps))) : printWithN(parts);
            }
          } else {
            return message.split(Record.separator).join('\n');
          }
        }
        return message;
      });
    }
    return [];
  }

  toMessage(): Message {
    const { fileName, line, column } = this.caller;
    return {
      date: new Date(this.date).toISOString(),
      name: this.name,
      metadata: this.metadata || {},
      level: this.level,
      args: this.args || [],
      file: `${fileName}:${line}:${column}`,
    };
  }
}

function printWithN(parts: string[]): string {
  for (let i = 0, i_next = 1, len = parts.length - 1, sln: number; i < len; i += 2, i_next += 2) {
    sln = Record.lineLength - parts[i_next].length;
    parts[i] += sln > 0 ? '\n' + ' '.repeat(Record.lineLength - parts[i_next].length) : '\n';
  }
  return parts.join('');
}
