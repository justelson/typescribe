const API_URL = "https://api.github.com/repos/justelson/typescribe/releases";
const MAX_API_PAGES = 10;

export const snapshotReleases = [
  {
    tag: "v0.1.0",
    name: "TypeScribe v0.1.0",
    url: "https://github.com/justelson/typescribe/releases/tag/v0.1.0",
    publishedAt: "2026-06-16T18:29:13Z",
    prerelease: false,
    body: "Local Electron transcript editor with timed Rows, Cara documents, playback sync, markers, and controlled exports.",
    zipUrl: "https://api.github.com/repos/justelson/typescribe/zipball/v0.1.0",
    tarUrl: "https://api.github.com/repos/justelson/typescribe/tarball/v0.1.0",
    assets: [
      {
        name: "TypeScribe-Setup-0.1.0.exe",
        url: "https://github.com/justelson/typescribe/releases/download/v0.1.0/TypeScribe-Setup-0.1.0.exe",
        size: 114941620,
        downloads: 8,
        digest: "sha256:3f00be0915415673667066bd6f108e4a90913ada7feeb724ee652e60354dc0ac",
      },
      {
        name: "latest.yml",
        url: "https://github.com/justelson/typescribe/releases/download/v0.1.0/latest.yml",
        size: 349,
        downloads: 0,
        digest: "sha256:c5a7d8f7193da7d0ce6c5dbc47cca0be41617aa8a72655457e5db835d71ab778",
      },
      {
        name: "TypeScribe-Setup-0.1.0.exe.blockmap",
        url: "https://github.com/justelson/typescribe/releases/download/v0.1.0/TypeScribe-Setup-0.1.0.exe.blockmap",
        size: 119888,
        downloads: 0,
        digest: "sha256:2f4fb74a7aad2e329258d56a1ce0b428b266d9f996afea6d81f012d94e2e6d7d",
      },
    ],
  },
];

function normalizeRelease(release) {
  return {
    tag: release.tag_name,
    name: release.name || release.tag_name,
    url: release.html_url,
    publishedAt: release.published_at || release.created_at,
    prerelease: Boolean(release.prerelease),
    body: release.body || "",
    zipUrl: release.zipball_url,
    tarUrl: release.tarball_url,
    assets: Array.isArray(release.assets)
      ? release.assets.map((asset) => ({
          name: asset.name,
          url: asset.browser_download_url,
          size: Number(asset.size) || 0,
          downloads: Number(asset.download_count) || 0,
          digest: asset.digest || "",
        }))
      : [],
  };
}

export async function loadReleases() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4500);
  try {
    const releases = [];
    for (let page = 1; page <= MAX_API_PAGES; page += 1) {
      const response = await fetch(`${API_URL}?per_page=100&page=${page}`, {
        headers: { Accept: "application/vnd.github+json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
      const batch = await response.json();
      if (!Array.isArray(batch)) throw new Error("GitHub returned an unexpected release payload");
      releases.push(...batch.filter((release) => !release.draft).map(normalizeRelease));
      if (batch.length < 100) break;
    }
    if (!releases.length) throw new Error("No published releases were returned");
    releases.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    return { releases, source: "github", error: null };
  } catch (error) {
    return { releases: snapshotReleases, source: "snapshot", error };
  } finally {
    window.clearTimeout(timeout);
  }
}

export function classifyAsset(name) {
  const value = name.toLowerCase();
  if (/\.(exe|msi|msix)$/.test(value)) return { key: "windows", label: "Windows" };
  if (/\.(dmg|pkg)$/.test(value)) return { key: "macos", label: "macOS" };
  if (/\.(appimage|deb|rpm)$/.test(value)) return { key: "linux", label: "Linux" };
  if (/\.(yml|yaml|blockmap)$/.test(value)) return { key: "updater", label: "Updater" };
  if (/\.(zip|tar|gz|tgz)$/.test(value)) return { key: "source", label: "Source" };
  return { key: "universal", label: "Universal" };
}

export function installableAssets(release) {
  const platformOrder = new Map([["windows", 0], ["macos", 1], ["linux", 2]]);
  return release.assets
    .map((asset) => ({ ...asset, platform: classifyAsset(asset.name) }))
    .filter((asset) => platformOrder.has(asset.platform.key))
    .sort((a, b) =>
      platformOrder.get(a.platform.key) - platformOrder.get(b.platform.key) || a.name.localeCompare(b.name),
    );
}

export function primaryAsset(release) {
  return installableAssets(release)[0] || null;
}

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; value >= 1024 && index < units.length; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${unit}`;
}

export function formatDate(value) {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
