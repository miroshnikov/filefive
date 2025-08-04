declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    S3_URL: string;
    S3_KEY: string;
    S3_SECRET: string;
  }
}