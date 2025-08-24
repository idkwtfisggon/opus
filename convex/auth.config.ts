export default {
  providers: [
    {
      domain: "https://jjdnkskwcmdndktrejws.supabase.co",
      applicationID: "supabase",
      // This tells Convex to accept JWTs from Supabase
      customClaims: (jwt) => {
        return {
          tokenIdentifier: jwt.sub, // Use Supabase user ID as token identifier
          role: jwt.user_metadata?.role || 'customer'
        };
      }
    },
  ]
};