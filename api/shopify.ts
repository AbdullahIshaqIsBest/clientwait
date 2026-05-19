import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Shopify-Storefront-Access-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ errors: [{ message: "Method not allowed" }] });
  }

  const { query, variables } = req.body;

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

  if (!domainSanitized || !token || token.length < 5) {
    return res.status(400).json({ 
      errors: [{ message: "Shopify Configuration Missing. Please add SHOPIFY_DOMAIN and STOREFRONT_TOKEN in Settings." }] 
    });
  }

  try {
    const versions = ['2026-04', '2026-01', '2025-10', '2025-07', '2025-04', '2025-01', 'unstable', 'graphql'];
    
    for (const apiVersion of versions) {
      const path = apiVersion === 'graphql' ? 'api/graphql' : `api/${apiVersion}/graphql.json`;
      const url = `https://${domainSanitized}/${path}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': token,
            'User-Agent': 'Shopify-Headless-Vercel-Proxy',
          },
          body: JSON.stringify({ query, variables }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        if (response.status === 404) {
          if (apiVersion === versions[versions.length - 1]) {
            return res.status(404).json({
              errors: [{ message: `Shopify returned 404 at ${domain}.` }]
            });
          }
          continue; 
        }

        const data = await response.json();
        res.setHeader('X-Shopify-API-Version', apiVersion);
        return res.status(response.status).json(data);
      } catch (err) {
        clearTimeout(timeoutId);
        if (apiVersion === versions[versions.length - 1]) throw err;
      }
    }
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return res.status(isTimeout ? 504 : 500).json({ 
      errors: [{ message: `Connection error: ${error instanceof Error ? error.message : 'Unknown'}` }] 
    });
  }
}
