import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';

const client = new S3Client({
  region: 'auto',
  endpoint: 'https://a4b666216cb4b052ed4f80cbe7834a47.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '926ef606c37a2f468b21c9b819a83d27',
    secretAccessKey: 'cc307cf8557247c78f7c599eb36e20049a4741b80a829c63efc93979fced22bb'
  }
});

const cmd = new PutBucketCorsCommand({
  Bucket: 'vaibhav-celebration-website',
  CORSConfiguration: {
    CORSRules: [{
      AllowedOrigins: [
        'http://localhost:3001',
        'http://localhost:3000',
        'https://admin.vaibhavcelebrations.in',
        'https://vaibhavcelebrations.in'
      ],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3600
    }]
  }
});

const r = await client.send(cmd);
console.log('PUT CORS status:', r.$metadata.httpStatusCode);

const g = new GetBucketCorsCommand({ Bucket: 'vaibhav-celebration-website' });
const cors = await client.send(g);
console.log('CORS rules set:', JSON.stringify(cors.CORSRules, null, 2));
