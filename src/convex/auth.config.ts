// Convex <-> Clerk JWT authentication.
//
// `domain` must be the issuer URL of the Clerk JWT (the "Issuer" shown on the
// Clerk JWT template named `convex`). Convex fetches
// `${domain}/.well-known/openid-configuration` to discover the JWKS endpoint.
//
// Set this on the deployment with:
//   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-instance>.clerk.accounts.dev
//
// `applicationID` is matched against the JWT `aud` claim and must equal the
// JWT template name configured in Clerk (`convex`).
declare const process: { env: Record<string, string | undefined> };

export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
