const fs = require('fs');

let schema = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');

const correctProduct = `  id                          String                        @id @default(cuid())
  title                       String
  slug                        String                        @unique
  sku                         String                        @unique
  barcode                     String?                       @unique
  unit                        String                        @default("piece")
  description                 String
  priceInPaise                Int
  compareAtPriceInPaise       Int?
  isActive                    Boolean                       @default(true)
  minOrderQuantity            Int                           @default(1)
  maxOrderQuantity            Int?`;

schema = schema.replace(/id                          String                        @id @default\(cuid\(\)\)\r?\n  title                       String\r?\n  slug                        String                        @unique\r?\n  sku                         String                        @unique/, correctProduct);

fs.writeFileSync('backend/prisma/schema.prisma', schema);
console.log('Fixed product model');
