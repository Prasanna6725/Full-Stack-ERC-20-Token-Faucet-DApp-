import express from 'express';
import { createServer as createViteServer } from 'vite';

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create Vite server in middleware mode
let vite;
if (process.env.NODE_ENV !== 'production') {
  vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  // In production, serve static files
  const compression = (await import('compression')).default;
  app.use(compression());
  app.use(express.static('dist'));
  
  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(new URL('./dist/index.html', import.meta.url).pathname);
  });
}

// Fallback to index.html for SPA routing
app.use('*', (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    return vite.transformIndexHtml(req.originalUrl, `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Token Faucet</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" src="/src/main.jsx"></script>
        </body>
      </html>
    `).then(html => res.end(html));
  }
  res.sendFile(new URL('./dist/index.html', import.meta.url).pathname);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://0.0.0.0:${port}`);
  console.log(`📋 Health check: http://0.0.0.0:${port}/health`);
});
