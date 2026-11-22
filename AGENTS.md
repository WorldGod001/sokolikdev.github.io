# sokolik.dev

- Run `npm ci` and `npm run build` to type-check and build.
- The Vite entry point is `src/main.tsx`. Keep portfolio and admin navigation within the SPA.
- Server-only authentication and Blob access live in `api/portfolio.js`. Keep server credentials out of the client bundle.
