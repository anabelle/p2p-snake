import { createServer, IncomingMessage, ServerResponse } from 'http';

export const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
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

  res.writeHead(404);
  res.end();
});
