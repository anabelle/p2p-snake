import { createServer, IncomingMessage, ServerResponse } from 'http';

// Create HTTP server with request handler for browser redirects
export const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  // Check if it's a browser request to the root URL
  if (req.url === '/' || req.url === '') {
    const userAgent = req.headers['user-agent'] || '';
    // Redirect browsers to the main game site
    if (
      userAgent.includes('Mozilla') ||
      userAgent.includes('Chrome') ||
      userAgent.includes('Safari')
    ) {
      res.writeHead(302, {
        Location: 'https://snake.heyanabelle.com'
      });
      res.end();
      return;
    }
  }

  // For all other requests (including Socket.IO), proceed normally
  // We can let socket.io handle upgrades, or just return 404 for non-root http requests.
  res.writeHead(404);
  res.end();
});
