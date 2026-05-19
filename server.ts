import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Shopify Proxy Route
  app.post("/api/shopify", async (req, res) => {
    const { query, variables } = req.body;
    
    // Diagnostic: Log available keys to help user calibrate
    const allEnvKeys = Object.keys(process.env);
    const shopifyEnvKeys = allEnvKeys.filter(k => k.toLowerCase().includes('shopify') || k.toLowerCase().includes('shop'));
    console.log(`[Shopify Proxy] Detected potential keys in environment:`, shopifyEnvKeys);
    
    // ----------------------------
    const domain = 
      process.env.SHOPIFY_DOMAIN || 
      process.env.VITE_SHOPIFY_DOMAIN || 
      process.env.SHOPIFY_SHOP_DOMAIN ||
      process.env.SHOP_DOMAIN ||
      process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN;

    let domainSanitized = (domain || '')
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .split('?')[0]
      .trim();

    // Fix common mistake where user gives just the name
    if (domainSanitized && !domainSanitized.includes('.') && domainSanitized !== 'localhost') {
      domainSanitized = `${domainSanitized}.myshopify.com`;
    }

    const token = 
      process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || 
      process.env.VITE_STOREFRONT_ACCESS_TOKEN ||
      process.env.STOREFRONT_ACCESS_TOKEN ||
      process.env.STOREFRONT_TOKEN ||
      process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

    if (!domain || !token || token.length < 5) {
      return res.status(400).json({ 
        errors: [{ 
          message: "Shopify Configuration Missing. Please set SHOPIFY_DOMAIN and STOREFRONT_TOKEN in Settings.",
          details: "You are currently seeing this because no valid Shopify credentials were found in the environment variables."
        }] 
      });
    }

    try {
      // 2026 Stable versions + Legacy Fallback
      const versions = ['2026-04', '2026-01', '2025-10', '2025-07', '2025-04', '2025-01', 'unstable', 'graphql'];
      
      for (const apiVersion of versions) {
        // Handle standard vs legacy path
        const path = apiVersion === 'graphql' ? 'api/graphql' : `api/${apiVersion}/graphql.json`;
        const url = `https://${domainSanitized}/${path}`;
        
        console.log(`[Shopify Proxy] [${apiVersion}] Requesting: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Storefront-Access-Token': token,
              'User-Agent': 'Shopify-Headless-2026-Proxy/v2',
            },
            body: JSON.stringify({ query, variables }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          
          if (response.status === 404) {
            console.warn(`[Shopify Proxy] [${apiVersion}] 404 at ${domain}`);
            if (apiVersion === versions[versions.length - 1]) {
              return res.status(404).json({
                errors: [{ 
                  message: `Shopify returned 404 at ${domain}. Ensure the domain matches your Shopify admin EXACTLY and the App is 'Installed'.`,
                  debug: { domain, token_exists: !!token, attempted_versions: versions }
                }]
              });
            }
            continue; 
          }

          const data = await response.json();
          // Forward response
          res.setHeader('X-Shopify-API-Version', apiVersion);
          return res.status(response.status).json(data);
        } catch (err) {
          clearTimeout(timeoutId);
          if (apiVersion === versions[versions.length - 1]) throw err;
        }
      }

    } catch (error) {
      console.error("[Shopify Proxy] Fatal:", error);
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      res.status(isTimeout ? 504 : 500).json({ 
        errors: [{ message: isTimeout ? "Connection timed out" : `Connection error: ${error instanceof Error ? error.message : 'Unknown'}` }] 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
