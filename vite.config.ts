import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const localGeminiApi = (): Plugin => ({
  name: 'local-gemini-api',
  configureServer(server) {
    server.middlewares.use('/api/gemini', async (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }

      let rawBody = '';
      req.on('data', chunk => {
        rawBody += chunk;
      });
      req.on('end', async () => {
        try {
          const { default: handler } = await import('./api/gemini.js');
          const apiReq = { ...req, body: rawBody ? JSON.parse(rawBody) : {} };
          const apiRes = {
            setHeader: (key: string, value: string) => res.setHeader(key, value),
            status: (code: number) => {
              res.statusCode = code;
              return apiRes;
            },
            json: (payload: unknown) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(payload));
            }
          };
          await handler(apiReq, apiRes);
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Local Gemini API failed.' }));
        }
      });
    });
  }
});

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    process.env.GEMINI_API_KEY ||= env.GEMINI_API_KEY;
    process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    process.env.GEMINI_MODEL ||= env.GEMINI_MODEL;

    return {
      base: '/',
      server: {
        port: 3001,
        host: '0.0.0.0',
      },
      preview: {
        port: 3001,
        host: '0.0.0.0',
      },
      plugins: [react(), localGeminiApi()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
