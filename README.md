# valera

Very smart logger for node.js platform

[![NPM](https://nodei.co/npm/valera.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/valera/)
![valera npm version](https://img.shields.io/npm/v/valera.svg) ![supported node version for valera](https://img.shields.io/node/v/valera.svg) ![total npm downloads for valera](https://img.shields.io/npm/dt/valera.svg) ![monthly npm downloads for valera](https://img.shields.io/npm/dm/valera.svg) ![npm licence for valera](https://img.shields.io/npm/l/valera.svg)

## Usage example

### Set global configuration

```typescript
import Valera, { Caller, Level, Record } from 'valera';

const accessLogFileStream = createWriteStream(accessLogFile, { flags: 'a' });
const errorLogFileStream = createWriteStream(errorLogFile, { flags: 'a' });

Valera.configure({
  name: 'app',
  metadata: { appId: process.pid + '.app' },
  formats: [
    `{% pipes.date(date) %} {% level.toUpperCase() %}{% pipes.name(name) %} {% pipes.message(args) %}<-|->{% pipes.file(caller) %}`,
    'json',
  ],
  pipes: {
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
  handler(record: Record): void {
    const [customOutput, jsonOutput] = record.messages();
    // 2 formats => 2 outputs
    if (!errorLevels.includes(record.level)) {
      process.stdout.write(customOutput + '\n');
      accessLogFileStream.write(jsonOutput + '\n');
    } else {
      process.stderr.write(customOutput + '\n');
      errorLogFileStream.write(jsonOutput + '\n');
    }
  },
});
```

### Overriding console

```typescript
Valera.overrideConsole();

console.warn('starting in production mode');

// custom format output:
// 2019-12-10T19:52:41.393Z WARN <app> starting in production mode                                        /path/to/project/index.ts:45:17
// yes, this is flexible separator "<-|->"
// JSON output:
// {"date":"2019-12-10T19:52:41.393Z","level":"warn","name":"app","file":"/path/to/project/index.ts:45:17","meta":{"appId":"12345.app"},"args":["starting in production mode"]}
```

### Changing separator mask

```typescript
Record.separator = '<=!=>';
Valera.configure({ formats: [`{% date %}<=!=>{% args.join(' ') %}`] });
```

### Providing metadata to message

```typescript
// metadata of the current message merges with the global metadata
console.meta({ isMaster: cluster.isMaster }).warn('starting in production mode');
// JSON output:
// {"date":"2019-12-10T19:52:41.393Z","level":"warn","name":"app","file":"/path/to/project/index.ts:45:17","meta":{"appId":"12345.app","isMaster":true},"args":["starting in production mode"]}
```

### Creating new logger instance

```typescript
const logger = new Valera({ name: 'request', meta: { appId: process.pid + '.app' } });
export const requestLogger = responseTime((req: any, res: any, time: number) => {
  logger.info(
    chalk.green(req.method),
    chalk.yellow(res.statusCode),
    req.url,
    chalk.yellow(time.toFixed(0) + 'ms'),
    chalk.green(`${req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress}`),
    chalk.magenta(req.headers['user-agent']),
  );
});
```

## Main features

1. Very flexible and easy to understand configuration
2. Metadata providing
3. Caller information
4. Console overriding
5. Typescript typings

## License

Licensed under MIT license
