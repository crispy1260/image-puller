import { useState } from "react";
import type {
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData } from "react-router";

import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function Index() {
  const { apiKey } = useLoaderData<typeof loader>();
  const [styles, setStyles] = useState("");
  const [maxWidth, setMaxWidth] = useState("");
  const [maxHeight, setMaxHeight] = useState("");
  const [crop, setCrop] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("styles", styles);
    if (maxWidth) formData.set("maxWidth", maxWidth);
    if (maxHeight) formData.set("maxHeight", maxHeight);
    if (crop) formData.set("crop", crop);

    try {
      const response = await fetch("/app/download", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Download failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "images.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <s-page heading="Image Puller">
      <s-section heading="Download images by style number">
        <s-paragraph>
          Paste a list of style numbers (one per line or comma-separated). The
          app will find the matching products by the{" "}
          <strong>details.product_style</strong> metafield and download all
          product images.
        </s-paragraph>

        <form onSubmit={handleSubmit}>
          <s-stack gap="base" direction="block">
            <s-text-area
              label="Style numbers"
              name="styles"
              value={styles}
              onChange={(e: any) => setStyles(e.currentTarget.value)}
              rows={8}
              placeholder="ABC-123, DEF-456, ..."
              required
            />

            <s-stack direction="inline" gap="base">
              <s-number-field
                label="Max width (px)"
                name="maxWidth"
                value={maxWidth}
                onChange={(e: any) => setMaxWidth(e.currentTarget.value)}
                details="Optional"
              />
              <s-number-field
                label="Max height (px)"
                name="maxHeight"
                value={maxHeight}
                onChange={(e: any) => setMaxHeight(e.currentTarget.value)}
                details="Optional"
              />
              <s-select
                label="Crop"
                name="crop"
                value={crop}
                onChange={(e: any) => setCrop(e.currentTarget.value)}
              >
                <s-option value="">No crop</s-option>
                <s-option value="CENTER">Center</s-option>
                <s-option value="TOP">Top</s-option>
                <s-option value="BOTTOM">Bottom</s-option>
                <s-option value="LEFT">Left</s-option>
                <s-option value="RIGHT">Right</s-option>
              </s-select>
            </s-stack>

            <s-button type="submit" loading={loading} variant="primary">
              Download images
            </s-button>

            {error && (
              <s-banner tone="critical" heading="Error">
                {error}
              </s-banner>
            )}
          </s-stack>
        </form>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
