type Header = { key: string; value: string };
type Rule = { source: string; destination: string };

export declare const API_ORIGIN_VARIABLE: 'PMOCORE_API_ORIGIN';
export declare const WEB_SECURITY_HEADERS: Header[];
export declare function apiOriginFrom(value: string | undefined): string;
export declare function buildVercelConfig(env: Record<string, string | undefined>): {
  framework: null;
  installCommand: string;
  buildCommand: string;
  outputDirectory: string;
  rewrites: Rule[];
  headers: { source: string; headers: Header[] }[];
};
export declare const config: ReturnType<typeof buildVercelConfig>;
