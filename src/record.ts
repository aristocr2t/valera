import { inspect } from 'util';

import { Caller } from './caller';

export type Meta = { [key: string]: any };

export type Level = 'debug' | 'info' | 'warn' | 'error' | 'critical' | 'verbose' | 'trace';

export interface Message {
  name: string;
  level: Level;
  date: string;
  file: string;
  meta: Meta;
  args: any[];
}

export type Pipes = { [key: string]: (v: any) => string };

export class Record {
  static formatReplaceMask = /\{%(.*?)%\}/g;
  static ansiColorsReplaceMask = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
  static fromFileName: string = __filename;
  static separator: string = '<-|->';
  static lineLength: number = 0;

  name: string | undefined;
  formats: string[];
  pipes: Pipes;
  level: Level;
  date: number;
  args: any[];
  caller: Caller;
  meta: Meta;

  constructor(name: string | undefined, formats: string[], pipes: Pipes, meta: Meta, level: Level, args: any[]) {
    this.name = name;
    this.formats = formats;
    this.pipes = pipes;
    this.level = level;
    this.meta = meta;
    this.date = Date.now();
    this.caller = Caller.get(Record.fromFileName);
    this.args = args;
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
        if (Record.lineLength > 0 && Record.separator && message.includes(Record.separator)) {
          const parts = message.split(Record.separator);
          const cleanMessage = message.replace(Record.ansiColorsReplaceMask, '');
          const seps = parts.length - 1;
          const sl = Record.lineLength - (cleanMessage.length - seps * Record.separator.length);
          const sln = Math.floor(sl / seps);
          if (sl % seps !== 0) for (let i = 0; i < parts.length; i += seps) parts[i] += ' ';
          return parts.join(sl > 0 ? ' '.repeat(sln) : '\n');
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
      level: this.level,
      name: this.name,
      file: `${fileName}:${line}:${column}`,
      meta: this.meta || {},
      args: this.args || [],
    };
  }
}
