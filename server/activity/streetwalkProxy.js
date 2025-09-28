const fetch = require('node-fetch');
const cheerio = require('cheerio');

const DEFAULT_STREETWALK_ORIGIN = process.env.STREETWALK_ORIGIN || 'https://streetwalk-web.onrender.com/';
const DEFAULT_PROXY_PREFIX = '/activity/streetwalk';
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function normaliseOrigin(origin) {
  if (!origin) {
    return DEFAULT_STREETWALK_ORIGIN;
  }
  return origin.endsWith('/') ? origin : `${origin}/`;
}

function rewriteStreetwalkHtml(html, proxyPrefix) {
  if (!html || typeof html !== 'string') {
    return html;
  }

  const prefix = proxyPrefix.endsWith('/') ? proxyPrefix.slice(0, -1) : proxyPrefix;
  const $ = cheerio.load(html, { decodeEntities: false });

  const cspSelectors = [
    'meta[http-equiv="Content-Security-Policy" i]',
    'meta[http-equiv="X-Content-Security-Policy" i]',
    'meta[http-equiv="Content-Security-Policy-Report-Only" i]'
  ];

  cspSelectors.forEach(selector => {
    $(selector).remove();
  });

  const rewriteUrl = value => {
    if (!value || typeof value !== 'string') {
      return value;
    }
    if (!value.startsWith('/')) {
      return value;
    }
    if (value.startsWith('//')) {
      return value;
    }
    if (value.startsWith(`${prefix}/`)) {
      return value;
    }
    return `${prefix}${value}`;
  };

  $('[src]').each((_, el) => {
    const current = $(el).attr('src');
    const rewritten = rewriteUrl(current);
    if (rewritten !== current) {
      $(el).attr('src', rewritten);
    }
  });

  $('[href]').each((_, el) => {
    const current = $(el).attr('href');
    const rewritten = rewriteUrl(current);
    if (rewritten !== current) {
      $(el).attr('href', rewritten);
    }
  });

  $('[srcset]').each((_, el) => {
    const current = $(el).attr('srcset');
    if (!current || typeof current !== 'string') {
      return;
    }

    const rewritten = current
      .split(',')
      .map(part => {
        const trimmed = part.trim();
        if (!trimmed) {
          return trimmed;
        }
        const [url, descriptor] = trimmed.split(/\s+/, 2);
        const newUrl = rewriteUrl(url);
        return descriptor ? `${newUrl} ${descriptor}` : newUrl;
      })
      .join(', ');

    $(el).attr('srcset', rewritten);
  });

  $('head').append(`
    <script>
      try {
        window.addEventListener('DOMContentLoaded', function () {
          if (window.parent) {
            window.parent.postMessage({ type: 'streetwalk-proxy-ready' }, '*');
          }
        });
      } catch (err) {
        console.warn('streetwalk proxy handshake failed', err);
      }
    </script>
  `);

  return $.html();
}

function sendProxyError(res, status, targetUrl) {
  const safeStatus = Number.isFinite(status) ? status : 502;
  res.status(safeStatus);
  res.set('Cache-Control', 'no-store');
  res.type('html');
  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><title>Streetwalk unavailable</title></head><body style="margin:0;display:flex;align-items:center;justify-content:center;background:#050013;color:#f4edff;font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;text-align:center;padding:24px;">
    <main>
      <h1 style="margin-bottom:16px;">Streetwalk is unavailable</h1>
      <p style="margin:0 auto;max-width:420px;line-height:1.5;color:#d5c6ff;">We couldn't connect to the Streetwalk servers. Try opening the experience in your browser instead.</p>
    </main>
    <script>
      try {
        if (window.parent) {
          window.parent.postMessage({ type: 'streetwalk-proxy-error', status: ${safeStatus}, url: ${JSON.stringify(targetUrl)} }, '*');
        }
      } catch (err) {
        console.warn('streetwalk proxy error handshake failed', err);
      }
    </script>
  </body></html>`);
}

function registerStreetwalkProxy(app, options = {}) {
  if (!app || typeof app.use !== 'function') {
    throw new TypeError('Expected an express application instance');
  }

  const upstreamOrigin = normaliseOrigin(options.origin || DEFAULT_STREETWALK_ORIGIN);
  const proxyPrefix = options.prefix || DEFAULT_PROXY_PREFIX;

  app.use(proxyPrefix, async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.set('Allow', 'GET, HEAD');
      return res.status(405).end();
    }

    const suffix = req.originalUrl.slice(req.baseUrl.length) || '/';
    const targetUrl = new URL(suffix, upstreamOrigin);

    let upstreamResponse;
    try {
      upstreamResponse = await fetch(targetUrl.toString(), {
        method: req.method,
        headers: {
          'user-agent': req.headers['user-agent'] || DEFAULT_USER_AGENT,
          accept: req.headers.accept || '*/*',
          'accept-language': req.headers['accept-language'] || 'en-US,en;q=0.9',
          referer: upstreamOrigin
        },
        redirect: 'manual'
      });
    } catch (error) {
      console.error('[streetwalk-proxy] fetch failed', {
        target: targetUrl.toString(),
        error: error?.message || error
      });
      return sendProxyError(res, 502, targetUrl.toString());
    }

    if (!upstreamResponse.ok) {
      console.warn('[streetwalk-proxy] upstream responded with error', {
        status: upstreamResponse.status,
        target: targetUrl.toString()
      });
      return sendProxyError(res, upstreamResponse.status, targetUrl.toString());
    }

    const contentType = upstreamResponse.headers.get('content-type') || '';
    const shouldRewriteHtml = contentType.includes('text/html');

    const ignoredHeaders = new Set([
      'content-length',
      'content-encoding',
      'transfer-encoding',
      'connection',
      'keep-alive',
      'content-security-policy',
      'x-frame-options'
    ]);

    upstreamResponse.headers.forEach((value, key) => {
      if (!ignoredHeaders.has(key)) {
        res.setHeader(key, value);
      }
    });

    res.setHeader(
      'Cache-Control',
      shouldRewriteHtml ? 'no-store' : 'public, max-age=300, stale-while-revalidate=300'
    );

    if (req.method === 'HEAD') {
      return res.status(upstreamResponse.status).end();
    }

    if (shouldRewriteHtml) {
      const upstreamHtml = await upstreamResponse.text();
      const rewrittenHtml = rewriteStreetwalkHtml(upstreamHtml, proxyPrefix);
      return res.status(upstreamResponse.status).type('html').send(rewrittenHtml);
    }

    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
    return res.status(upstreamResponse.status).send(buffer);
  });
}

module.exports = { registerStreetwalkProxy };
