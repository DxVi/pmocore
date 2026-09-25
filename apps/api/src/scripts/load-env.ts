import { config } from 'dotenv';

// Loads apps/api/.env when present (development). In hosted environments the
// platform injects variables and no file exists, which is not an error.
config({ quiet: true });
