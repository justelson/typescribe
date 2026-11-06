import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyAsset, installableAssets, primaryAsset, snapshotReleases } from '../../landing/src/features/releases/releaseData.js';

test('platform classification recognizes supported installer formats', () => {
  assert.equal(classifyAsset('TypeScribe.exe').key, 'windows');
  assert.equal(classifyAsset('TypeScribe.dmg').key, 'macos');
  assert.equal(classifyAsset('TypeScribe.AppImage').key, 'linux');
});

test('updater metadata and source archives do not count as installers', () => {
  const installers = installableAssets(snapshotReleases[0]);
  assert.deepEqual(installers.map((asset) => asset.name), ['TypeScribe-Setup-0.1.0.exe']);
  assert.equal(primaryAsset(snapshotReleases[0]).platform.key, 'windows');
});

test('installers sort in Windows, macOS, Linux order', () => {
  const release = {
    assets: [
      { name: 'TypeScribe.rpm', url: '#', size: 1, downloads: 0, digest: '' },
      { name: 'TypeScribe.pkg', url: '#', size: 1, downloads: 0, digest: '' },
      { name: 'TypeScribe.msi', url: '#', size: 1, downloads: 0, digest: '' },
    ],
  };
  assert.deepEqual(installableAssets(release).map((asset) => asset.platform.key), ['windows', 'macos', 'linux']);
});
