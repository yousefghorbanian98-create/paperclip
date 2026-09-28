import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const uiRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

type Manifest = {
  display?: string;
  display_override?: string[];
  start_url?: string;
  scope?: string;
  icons?: { src: string; sizes?: string; type?: string; purpose?: string }[];
  shortcuts?: { name: string; url: string }[];
};

function readManifest(): Manifest {
  return JSON.parse(readFileSync(resolve(uiRoot, "public/site.webmanifest"), "utf8")) as Manifest;
}

function readHtml(): string {
  return readFileSync(resolve(uiRoot, "index.html"), "utf8");
}

describe("PWA install mode", () => {
  it("launches installed copies without browser chrome", () => {
    const manifest = readManifest();
    const html = readHtml();

    expect(manifest.display).toBe("standalone");
    // display_override must still degrade to a browser tab so a user agent
    // without standalone support can open the same start_url.
    expect(manifest.display_override?.at(-1)).toBe("browser");
    expect(html).toContain('name="mobile-web-app-capable" content="yes"');
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(html).toContain('name="apple-mobile-web-app-status-bar-style"');
  });

  it("keeps the in-app replacements for the browser chrome it hides", () => {
    // A chromeless launch has no reload or share button, so the app must ship
    // its own; see StandaloneBrowserControls, gated on isChromelessDisplayMode.
    const controls = readFileSync(
      resolve(uiRoot, "src/components/StandaloneBrowserControls.tsx"),
      "utf8",
    );

    expect(controls).toContain("isChromelessDisplayMode");
    expect(controls).toContain('aria-label={label}');
  });

  it("installs at the app root so every in-app route stays inside the window", () => {
    const manifest = readManifest();

    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
  });

  it("ships a maskable icon so Android does not letterbox the launcher icon", () => {
    const manifest = readManifest();

    expect(manifest.icons?.some((icon) => icon.purpose === "maskable")).toBe(true);
    expect(manifest.icons?.some((icon) => icon.sizes === "512x512")).toBe(true);
  });

  it("exposes launcher shortcuts that point at real routes", () => {
    const manifest = readManifest();
    const app = readFileSync(resolve(uiRoot, "src/App.tsx"), "utf8");

    expect(manifest.shortcuts?.length).toBeGreaterThan(0);
    for (const shortcut of manifest.shortcuts ?? []) {
      expect(shortcut.url.startsWith("/")).toBe(true);
      expect(app).toContain(`path="${shortcut.url.slice(1)}"`);
    }
  });

  it("fetches the manifest with credentials so authenticating proxies can serve it", () => {
    const html = readHtml();

    // Browsers fetch <link rel="manifest"> in "omit credentials" mode unless
    // the link opts in. Behind an authenticating reverse proxy (e.g. a
    // managed-hosting front door), the cookie-less request is rejected on
    // every page load.
    expect(html).toContain('rel="manifest" href="/site.webmanifest" crossorigin="use-credentials"');
  });
});
