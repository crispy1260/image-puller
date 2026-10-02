import type { ActionFunctionArgs } from "react-router";
import { Readable } from "node:stream";
import archiver from "archiver";

import { authenticate } from "../shopify.server";
import { findProductsByStyle, type ImageTransform } from "../utils/products.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const raw = (formData.get("styles") as string) || "";
  const styles = raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (styles.length === 0) {
    return new Response("Enter at least one style number.", { status: 400 });
  }

  const width = parseInt(formData.get("maxWidth") as string, 10);
  const height = parseInt(formData.get("maxHeight") as string, 10);
  const crop = (formData.get("crop") as string) || undefined;

  const transform: ImageTransform | undefined =
    !Number.isNaN(width) || !Number.isNaN(height) || crop
      ? {
          maxWidth: Number.isNaN(width) ? undefined : width,
          maxHeight: Number.isNaN(height) ? undefined : height,
          crop,
        }
      : undefined;

  type ImageEntry = {
    url: string;
    filename: string;
  };

  const images: ImageEntry[] = [];

  for (const style of styles) {
    const products = await findProductsByStyle(admin, style, transform);

    for (const product of products) {
      const productId = product.id.split("/").pop() || "unknown";
      const productTitle = product.title || "product";
      const media = product.media?.nodes || [];

      media.forEach((mediaNode, index) => {
        if (!mediaNode.image) return;

        const img = mediaNode.image;
        const downloadUrl = img.resizedUrl || img.url;
        if (!downloadUrl) return;

        const urlObj = new URL(downloadUrl);
        const originalName = urlObj.pathname.split("/").pop() || `${img.id}.jpg`;
        const cleanStyle = style.replace(/[^a-zA-Z0-9_-]/g, "_");
        const cleanProductId = productId.replace(/[^a-zA-Z0-9_-]/g, "_");
        const cleanTitle = productTitle.replace(/[^a-zA-Z0-9_-]/g, "_");
        const filename = `${cleanStyle}_${cleanTitle}_${cleanProductId}_${index + 1}_${originalName}`;

        images.push({ url: downloadUrl, filename });
      });
    }
  }

  if (images.length === 0) {
    return new Response("No images found for the provided style numbers.", { status: 404 });
  }

  const archive = archiver("zip", { zlib: { level: 1 } });
  const stream = Readable.toWeb(archive) as ReadableStream;

  (async () => {
    for (const image of images) {
      try {
        const response = await fetch(image.url);
        if (!response.ok) {
          console.warn(`Could not download ${image.url}: ${response.status}`);
          continue;
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        archive.append(buffer, { name: image.filename });
      } catch (err) {
        console.warn(`Could not download ${image.url}:`, err);
      }
    }
    archive.finalize();
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="images.zip"`,
    },
  });
};
