import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    root: __dirname,
    include: ['tests/**/*.test.js'],
    environment: 'node',
    globals: false
  }
});
