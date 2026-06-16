# Release Checklist

1. Confirm the app has no private seeded transcripts or local file paths.
2. Update `package.json` version.
3. Run checks:

   ```bash
   npm run check
   ```

4. Build landing page:

   ```bash
   npm run build:landing
   ```

5. Package Windows installer locally:

   ```bash
   npm run package:win
   ```

6. Generate release notes:

   ```bash
   npm run release:notes
   ```

7. Commit and tag:

   ```bash
   git add .
   git commit -m "Prepare TypeScribe OSS release"
   git tag v0.1.0
   ```

8. Push only after reviewing the diff:

   ```bash
   git push origin main --tags
   ```

GitHub publishing is configured for `justelson/typescribe` through `electron-builder`, but publishing should be run only after the repository exists and the release artifacts have been reviewed.
