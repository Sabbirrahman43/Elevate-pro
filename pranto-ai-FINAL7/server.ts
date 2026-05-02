import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser
  app.use(express.json());

  // OAuth Callback Handler for PostMessage
  app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
    res.send(`
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { 
              font-family: -apple-system, system-ui, sans-serif; 
              display: flex; 
              flex-direction: column;
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0;
              background: #f9fafb;
              color: #111827;
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 4px solid #e5e7eb;
              border-top: 4px solid #2563eb;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin-bottom: 20px;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            h1 { font-size: 24px; font-weight: 800; }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <h1>Finalizing Auth...</h1>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  });

  // Vite Middleware for Dev
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Pranto AI Server running at http://localhost:${PORT}`);
  });
}

startServer();
