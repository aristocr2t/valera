import Valera, { Caller, Record } from 'valera';
import { inspect } from 'util';

describe('index', () => {
  let record!: Record;
  it('should be configure default Valera options', done => {
    expect(Valera.logname).toBeUndefined();
    Valera.configure({
      name: 'app',
      metadata: { appId: 'test' },
			formats: [
				`{{ date | date }} {{ level | uppercase }}{{ name | name }} {{ args | message }}<-|->{{ caller | file }}`,
				'json',
			],
			pipes: {
				uppercase(text: string): string {
					return text.toUpperCase();
				},
				date(date: number): string {
					return new Date(date).toISOString();
				},
				name(name: string | undefined): string {
					return name ? ` <${name}>` : '';
				},
				message(args: any[]): string {
					return args.map((x) => (typeof x === 'string' ? x : x instanceof Error ? x.stack : inspect(x, false, null, false))).join('\n');
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
      .meta({ test: 1 })
      .name('test')
      .log('test message');
    expect(record.name).toBe('app.test');
    expect(record.metadata.test).toBe(1);
    const [consoleMessage, json] = record.messages();
    Valera.CONSOLE_METHODS.log.call(console, consoleMessage);
    Valera.CONSOLE_METHODS.log.call(console, json);
    expect(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z DEBUG \<app\.test\> test message\s+.+:\d+:\d+$/.test(
        consoleMessage,
      ),
    ).toBeTruthy();
    const obj = JSON.parse(json);
    expect(obj).toBeDefined();
    done();
  });
});
