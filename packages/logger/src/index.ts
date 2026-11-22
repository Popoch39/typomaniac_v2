import {
  configure,
  getAnsiColorFormatter,
  getLogger as getCategoryLogger,
  jsonLinesFormatter,
  type LogLevel,
  parseLogLevel,
  reset,
  type Sink,
} from "@logtape/logtape";

export type { Logger, LogLevel, LogRecord, Sink } from "@logtape/logtape";

/** The modules of the API that log under a category of their own, below `api`. */
export type ApiModule = "http" | "duel" | "queue" | "online" | "rate-limit";

export type Category = "api" | `api.${ApiModule}` | "matchmaker" | "fair-play-worker";

export const getLogger = (category: Category) => getCategoryLogger(category.split("."));

// "warn" is accepted as well, the spelling most other tools use for LogTape's "warning".
const readLogLevel = (value = "info"): LogLevel =>
  value.toLowerCase() === "warn" ? "warning" : parseLogLevel(value);

// Written straight to stdout rather than through the console, which sends errors to stderr: the
// host collects one stream.
const stdoutSink =
  (format: (record: Parameters<Sink>[0]) => string): Sink =>
  (record) => {
    process.stdout.write(format(record));
  };

const productionSink = stdoutSink(jsonLinesFormatter);
const developmentSink = stdoutSink(getAnsiColorFormatter({ timestamp: "time" }));

/**
 * Configures logging for the whole process, once at its entry. Until it is called, every logger
 * drops its records, which keeps `bun test` quiet. A test passes its own sink to read the records.
 */
export const setupLogger = async ({ sink }: { readonly sink?: Sink } = {}) => {
  const out = sink ?? (process.env.NODE_ENV === "production" ? productionSink : developmentSink);
  await configure({
    reset: true,
    sinks: { out },
    loggers: [
      { category: [], sinks: ["out"], lowestLevel: readLogLevel(process.env.LOG_LEVEL) },
      // LogTape's own diagnostics: only its failures, not its notice that it is configured.
      {
        category: ["logtape", "meta"],
        sinks: ["out"],
        lowestLevel: "warning",
        parentSinks: "override",
      },
    ],
  });
};

/** Undoes `setupLogger`, so that a test file leaves the loggers silent for the next one. */
export const resetLogger = reset;
