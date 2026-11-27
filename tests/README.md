# Site tests

Automated checks for rybiak.com, run by GitHub Actions on every pull request and on every push to `main` (`.github/workflows/site-tests.yml`).

The tooling lives in this folder rather than at the repo root so Cloudflare Pages doesn't detect a `package.json` and start installing packages on deploy.

## What's checked

- **HTML validity** of `index.html` and `404.html` (html-validate)
- **Cypress end-to-end tests** against `server.js`, a small local server that mimics Cloudflare Pages (applies `../_headers`, returns `404.html` with status 404 for unknown paths):
  - name, tagline, profile links (order, new tab, `rel`, labels)
  - search and link-preview metadata
  - ProfilePage/Person structured data, matching the links on the page
  - every referenced icon, image and stylesheet is served with the right type
  - nothing the security policy would block (outside files, inline styles or scripts)
  - no Cyrillic in anything visible (it's allowed only in the structured data)
  - accessibility scan (axe-core, WCAG 2.2 AA)
  - no console errors
  - all icons on one line and no sideways scrolling at 320, 375, 390, 430 and 1280px
  - unknown addresses return a styled, `noindex` 404 page

## Running locally

```sh
cd tests
npm ci
npm test          # HTML validation + all Cypress tests
npm run cy:open   # Cypress's interactive runner (start `npm run serve` first)
```
