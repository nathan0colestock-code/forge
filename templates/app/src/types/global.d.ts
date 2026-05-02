/// <reference types="next" />
/// <reference types="next/image-types/global" />

declare namespace NodeJS {
  interface ProcessEnv {
    TURSO_DATABASE_URL: string;
    TURSO_AUTH_TOKEN: string;

    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
    CLERK_SECRET_KEY: string;
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: string;
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: string;
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: string;
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: string;

    CLOUDFLARE_ACCOUNT_ID: string;
    CLOUDFLARE_R2_BUCKET_NAME: string;
    CLOUDFLARE_R2_ACCESS_KEY_ID: string;
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: string;
    CLOUDFLARE_R2_ENDPOINT: string;

    RESEND_API_KEY: string;
    RESEND_FROM_EMAIL: string;

    BETTERSTACK_INGEST_URL: string;
    BETTERSTACK_SOURCE_TOKEN: string;
    BETTERSTACK_SOURCE_ID: string;
    BETTERSTACK_API_TOKEN: string;

    FLY_APP_NAME: string;
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_APP_NAME: string;
  }
}
