type AdminApiContext = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> }
  ) => Promise<Response>;
};

export type ImageTransform = {
  maxWidth?: number;
  maxHeight?: number;
  crop?: string;
};

export type ProductNode = {
  id: string;
  title: string;
  media?: {
    nodes: {
      image: {
        id: string;
        url: string;
        resizedUrl?: string;
        width?: number;
        height?: number;
        altText?: string | null;
      };
    }[];
  };
};

function buildQuery(transform?: ImageTransform) {
  if (transform && (transform.maxWidth || transform.maxHeight || transform.crop)) {
    return `#graphql
      query FindProductsByStyle($query: String!, $maxWidth: Int, $maxHeight: Int, $crop: CropRegion) {
        products(first: 50, query: $query) {
          nodes {
            id
            title
            media(first: 100) {
              nodes {
                ... on MediaImage {
                  image {
                    id
                    url
                    resizedUrl: url(transform: { maxWidth: $maxWidth, maxHeight: $maxHeight, crop: $crop })
                    width
                    height
                    altText
                  }
                }
              }
            }
          }
        }
      }
    `;
  }

  return `#graphql
    query FindProductsByStyle($query: String!) {
      products(first: 50, query: $query) {
        nodes {
          id
          title
          media(first: 100) {
            nodes {
              ... on MediaImage {
                image {
                  id
                  url
                  width
                  height
                  altText
                }
              }
            }
          }
        }
      }
    }
  `;
}

export async function findProductsByStyle(
  admin: AdminApiContext,
  style: string,
  transform?: ImageTransform
): Promise<ProductNode[]> {
  const escaped = style.replace(/"/g, '\\"');
  const query = `metafields.details.product_style:"${escaped}"`;
  const variables: Record<string, unknown> = { query };

  if (transform) {
    if (transform.maxWidth) variables.maxWidth = transform.maxWidth;
    if (transform.maxHeight) variables.maxHeight = transform.maxHeight;
    if (transform.crop) variables.crop = transform.crop;
  }

  const response = await admin.graphql(buildQuery(transform), { variables });
  const result = (await response.json()) as {
    data?: { products?: { nodes: ProductNode[] } };
    errors?: unknown[];
  };

  if (result.errors) {
    throw new Error(JSON.stringify(result.errors));
  }

  return result.data?.products?.nodes || [];
}
