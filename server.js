require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const API_KEY = process.env.OPENROUTER_API_KEY;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 - Fichier introuvable');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const reqPath = decodeURIComponent(reqUrl.pathname);

  if (req.method === 'GET' && reqPath === '/') {
    return sendFile(res, path.join(__dirname, 'index.html'));
  }

  if (req.method === 'POST' && reqPath === '/api/chat') {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        if (!API_KEY) {
          return sendJson(res, 500, {
            error: 'Clé API manquante. Ajoute OPENROUTER_API_KEY dans ton fichier .env'
          });
        }

        let parsedBody = {};
        try {
          parsedBody = JSON.parse(body || '{}');
        } catch {
          return sendJson(res, 400, { error: 'Requête invalide' });
        }

        const messages = Array.isArray(parsedBody.messages) ? parsedBody.messages : [];

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'La Maison des Fleurs'
          },
          body: JSON.stringify({
            model: 'openrouter/free',
            messages: [
              {
                role: 'system',
                content: `Tu es Flora, une conseillère florale experte et chaleureuse pour la boutique "La Maison des Fleurs".
Tu aides les clients à choisir le bouquet parfait selon l'occasion, donner des conseils d'entretien, et informer sur la livraison (Paris et IDF, J+1).

Catalogue :
- Bouquet Romantique (roses & pivoines) — 45€
- Collection Printemps (tulipes, jonquilles) — 35€
- Orchidée Blanche — 55€
- Bouquet Champêtre (lavande, tournesols) — 38€
- Succulent Box — 28€
- Composition Zen — 62€
- Ficus Lyrata — 48€
- Bouquet Pastel — 42€

Réponds en français, avec chaleur.
Sois concise : 2 à 4 phrases maximum.
Tu peux utiliser quelques emojis floraux avec modération.`
              },
              ...messages.slice(-10)
            ]
          })
        });

        const data = await response.json();

        console.log('Status OpenRouter:', response.status);
        console.log('Réponse OpenRouter:', JSON.stringify(data, null, 2));

        if (!response.ok) {
          const message =
            data?.error?.message ||
            data?.message ||
            'Erreur OpenRouter inconnue';

          return sendJson(res, response.status, { error: message });
        }

        const reply = data?.choices?.[0]?.message?.content?.trim() || "Je n'ai pas pu répondre.";
        return sendJson(res, 200, { reply });
      } catch (err) {
        console.error('Erreur serveur :', err);
        return sendJson(res, 500, { error: 'Erreur serveur' });
      }
    });

    return;
  }

  if (req.method === 'GET') {
    const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(__dirname, safePath);

    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Accès interdit');
    }

    return sendFile(res, filePath);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
  console.log('🌸 Flora est prête à répondre');
});