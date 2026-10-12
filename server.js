const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// 1. Serve a simple frontend interface (Omnibox/URL bar)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>My Stealth Proxy</title>
            <style>
                body { background-color: #0d1117; color: white; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                input { padding: 12px; width: 400px; border-radius: 6px; border: 1px solid #30363d; background: #161b22; color: white; font-size: 16px; }
                button { padding: 12px 20px; border-radius: 6px; border: none; background: #238636; color: white; font-size: 16px; cursor: pointer; margin-left: 10px; }
            </style>
        </head>
        <body>
            <h1>Stealth Web Proxy</h1>
            <div>
                <input type="text" id="urlInput" placeholder="https://example.com" value="https://example.com">
                <button onclick="go()">Browse</button>
            </div>
            <script>
                function go() {
                    let url = document.getElementById('urlInput').value;
                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                        url = 'https://' + url;
                    }
                    // Encodes the target URL to pass it safely through the path
                    window.location.href = '/service/' + btoa(url);
                }
            </script>
        </body>
        </html>
    `);
});

// 2. Intercept proxy requests, decode the target URL, and route traffic
app.use('/service/:targetUrl', (req, res, next) => {
    try {
        // Decode the Base64 URL passed from the frontend
        const targetUrl = Buffer.from(req.params.targetUrl, 'base64').toString('ascii');
        const parsedUrl = new URL(targetUrl);

        const proxy = createProxyMiddleware({
            target: parsedUrl.origin,
            changeOrigin: true,
            pathRewrite: {
                [`^/service/${req.params.targetUrl}`]: parsedUrl.pathname,
            },
            // Modify headers so the target site accepts the proxy connection
            onProxyReq: (proxyReq, req, res) => {
                proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            },
            // Error handling if the site is down or blocks the connection
            onError: (err, req, res) => {
                res.status(500).send('Proxy Error: Unable to fetch the website.');
            }
        });

        proxy(req, res, next);
    } catch (e) {
        res.status(400).send('Invalid encoded URL mapping.');
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server is actively running at http://localhost:${PORT}`);
});
