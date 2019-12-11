import Valera, { Caller, Record } from 'valera';
import { inspect } from 'util';

describe('index', () => {
  let record: Record;
  it('should be configure default Valera options', done => {
    expect(Valera.logname).toBeNull();
    Valera.configure({
      name: 'app',
      metadata: { appId: 'test' },
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
    expect(Valera.logname).toBe('app');
    done();
  });

  it('should be override console methods', done => {
    Valera.overrideConsole();
    done();
  });

  it('should be create messages by formats', done => {
    console
      .name('test')
      .meta({ test: 1 })
      .log('test message');
    expect(record.name).toBe('test');
    expect(record.metadata.test).toBe(1);
    const [consoleMessage, json, inspect] = record.messages();
    Valera.CONSOLE_METHODS.log.call(console, consoleMessage);
    Valera.CONSOLE_METHODS.log.call(console, json);
    Valera.CONSOLE_METHODS.log.call(console, inspect);
    expect(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z (?:DEBUG|INFO|WARN|ERROR|CRITICAL|VERBOSE|TRACE) \<test\> test message\s{1,}(?:.+):\d+:\d+$/.test(
        consoleMessage,
      ),
    ).toBeTruthy();
    const obj = JSON.parse(json);
    expect(obj).toBeDefined();
    done();
  });
});
