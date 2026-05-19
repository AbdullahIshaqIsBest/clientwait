/**
 * Shopify Storefront API Service
 * 
 * To use this with a real Shopify store:
 * 1. Go to Shopify Admin > Settings > Apps and sales channels > Develop apps.
 * 2. Create an app and configure Storefront API scopes.
 * 3. Copy the Storefront access token.
 * 4. Update the variables below or use environment variables.
 */

// Helper to get sanitized domain
const getShopifyDomain = () => {
  const rawDomain = import.meta.env.VITE_SHOPIFY_DOMAIN || 'YOUR-SHOP.myshopify.com';
  return rawDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
};

const getAccessToken = () => import.meta.env.VITE_STOREFRONT_ACCESS_TOKEN || 'MISSING-TOKEN';

export async function shopifyFetch<T>(query: string, variables = {}): Promise<{ data: T }> {
  try {
    // 1. Try hitting the API Proxy (Works in AI Studio and Vercel)
    const proxyResponse = await fetch('/api/shopify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (proxyResponse.ok) {
      const contentType = proxyResponse.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const responseJson = await proxyResponse.json();
        if (responseJson.errors) {
          throw new Error(responseJson.errors[0].message || 'Shopify GraphQL Error');
        }
        return responseJson;
      }
    }

    // 2. Fallback to direct client-side call if proxy fails or is not found (404)
    // This ensures that even if Vercel serverless fails, the app still works if tokens are in env
    const domain = getShopifyDomain();
    const token = getAccessToken();
    
    // Attempt multiple versions for compatibility
    const versions = ['2026-04', '2025-10', '2025-01'];
    let lastError = null;

    for (const version of versions) {
      try {
        const directResponse = await fetch(`https://${domain}/api/${version}/graphql.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': token,
          },
          body: JSON.stringify({ query, variables }),
        });

        if (directResponse.ok) {
          const responseJson = await directResponse.json();
          if (responseJson.errors) {
            throw new Error(responseJson.errors[0].message || 'Shopify GraphQL Error');
          }
          return responseJson;
        }
        
        if (directResponse.status === 404) continue;
        
        const errorJson = await directResponse.json();
        throw new Error(errorJson.errors?.[0]?.message || 'Direct fetch failed');
      } catch (err) {
        lastError = err;
        continue;
      }
    }
    
    throw lastError || new Error('All connection attempts failed. Check Shopify credentials.');
  } catch (error) {
    console.error("[Shopify Service Error]", error);
    throw error;
  }
}

/**
 * Creates a cart and returns the checkoutUrl for redirect.
 */
export async function createCheckout(lineItems: { variantId: string; quantity: number }[]) {
  const query = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      lines: lineItems.map(item => ({
        merchandiseId: item.variantId,
        quantity: item.quantity
      }))
    }
  };

  const { data } = await shopifyFetch<any>(query, variables);
  
  if (!data || !data.cartCreate) {
    throw new Error("Failed to receive a valid response from Shopify.");
  }

  if (data.cartCreate.userErrors?.length > 0) {
    throw new Error(data.cartCreate.userErrors[0].message);
  }
  
  if (!data.cartCreate.cart) {
    throw new Error("Checkout creation failed. Please ensure your Shopify credentials are correct.");
  }
  
  return data.cartCreate.cart.checkoutUrl;
}

export async function getCollections() {
  const query = `
    query getCollections {
      collections(first: 10) {
        edges {
          node {
            id
            title
            handle
            image {
              url
              altText
            }
          }
        }
      }
    }
  `;
  const { data } = await shopifyFetch<any>(query);
  return data.collections.edges.map((edge: any) => edge.node);
}

export async function getCollectionProducts(handle: string) {
  const query = `
    query getCollectionProducts($handle: String!) {
      collection(handle: $handle) {
        id
        title
        products(first: 50) {
          edges {
            node {
              id
              title
              description
              handle
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              compareAtPriceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 5) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              options {
                id
                name
                values
              }
              variants(first: 20) {
                edges {
                  node {
                    id
                    title
                    price {
                      amount
                    }
                    compareAtPrice {
                      amount
                    }
                    selectedOptions {
                      name
                      value
                    }
                    image {
                      url
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  const { data } = await shopifyFetch<any>(query, { handle });
  return data.collection?.products.edges.map((edge: any) => edge.node) || [];
}

export async function getProductByHandle(handle: string) {
  const query = `
    query getProduct($handle: String!) {
      product(handle: $handle) {
        id
        title
        description
        descriptionHtml
        handle
        images(first: 5) {
          edges {
            node {
              url
              altText
            }
          }
        }
        variants(first: 1) {
          edges {
            node {
              id
              price {
                amount
                currencyCode
              }
              compareAtPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `;
  const { data } = await shopifyFetch<any>(query, { handle });
  return data.product;
}

export async function getRelatedProducts(productId: string) {
  const query = `
    query getRelatedProducts($productId: ID!) {
      productRecommendations(productId: $productId) {
        id
        title
        handle
        images(first: 1) {
          edges {
            node {
              url
              altText
            }
          }
        }
        variants(first: 1) {
          edges {
            node {
              id
              price {
                amount
                currencyCode
              }
              compareAtPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `;
  const { data: recoData } = await shopifyFetch<any>(query, { productId });
  return recoData.productRecommendations;
}

export async function getHomePageImages() {
  const query = `
    query getHomeGallery($handle: String!) {
      collection(handle: $handle) {
        products(first: 3) {
          edges {
            node {
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  try {
    const { data } = await shopifyFetch<any>(query, { handle: 'home-gallery' });
    return data.collection?.products.edges.map((edge: any) => ({
      url: edge.node.images.edges[0]?.node.url,
      alt: edge.node.images.edges[0]?.node.altText || 'Home Gallery Image'
    })).filter((img: any) => img.url) || [];
  } catch (err) {
    console.warn("Home gallery collection not found, using fallbacks");
    return [];
  }
}

export const GET_PRODUCTS_QUERY = `
  query getProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          description
          handle
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          compareAtPriceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
          options {
            id
            name
            values
          }
          variants(first: 20) {
            edges {
              node {
                id
                title
                price {
                  amount
                }
                compareAtPrice {
                  amount
                }
                selectedOptions {
                  name
                  value
                }
                image {
                  url
                }
              }
            }
          }
        }
      }
    }
  }
`;
