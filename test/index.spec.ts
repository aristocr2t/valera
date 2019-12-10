import Valera, { Caller, Level, Record } from 'valera';
import { inspect } from 'util';

describe('index', () => {
  let record: Record;
  it('should be configure default Valera options', done => {
    Valera.configure({
      name: 'app',
      meta: { appId: 'test' },
      formats: [
        `{% pipes.date(date) %} {% level.toUpperCase() %}{% pipes.name(name) %} {% pipes.message(args) %}<-|->{% pipes.file(caller) %}`,
        'json',
        'inspect',
      ],
      pipes: {
        date(date: number): string {
          return new Date(date).toISOString();
        },
        name(name: string | undefined): string {
          return name ? ` <${name}>` : '';
        },
        message(args: any[]): string {
          return args.map(x => (typeof x === 'string' ? x : x instanceof Error ? x.stack : inspect(x, false, null, false))).join('\n');
        },
        file({ fileName, line, column }: Caller): string {
          return `${fileName}:${line}:${column}`;
        },
      },
      handler(r: Record): void {
        record = r;
      },
    });
    done();
  });

  it('should be override console methods', done => {
    Valera.overrideConsole({});
    done();
  });

  it('should be create messages by formats', done => {
    console.log('test message');
    const [consoleMessage, json, inspect] = record.messages();
    Valera.CONSOLE_METHODS.log.call(console, consoleMessage);
    Valera.CONSOLE_METHODS.log.call(console, json);
    Valera.CONSOLE_METHODS.log.call(console, inspect);
    expect(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z (?:DEBUG|INFO|WARN|ERROR|CRITICAL|VERBOSE|TRACE) \<app\> test message\s{1,}(?:.+):\d+:\d+$/.test(
        consoleMessage,
      ),
    ).toBeTruthy();
    const obj = JSON.parse(json);
    expect(obj).toBeDefined();
    done();
  });
});
