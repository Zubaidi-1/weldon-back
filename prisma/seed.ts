import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import {
  OrderStatus,
  PrismaClient,
  ProductCategory,
  productStatus,
} from '../src/generated/prisma/client';
import type { Product, User } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const SEED_COUNT = 55;
const SEED_EMAIL_DOMAIN = 'example.com';
const SEED_SKU_PREFIX = 'SEED-PRODUCT';

const firstNames = [
  'Adam',
  'Lina',
  'Omar',
  'Sara',
  'Yazan',
  'Maya',
  'Nour',
  'Khaled',
  'Hana',
  'Tala',
];

const lastNames = [
  'Saleh',
  'Haddad',
  'Nasser',
  'Mansour',
  'Karam',
  'Darwish',
  'Qasem',
  'Amin',
  'Farah',
  'Zein',
];

const governates = [
  'Amman',
  'Irbid',
  'Zarqa',
  'Balqa',
  'Madaba',
  'Karak',
  'Aqaba',
  'Jerash',
  'Ajloun',
  'Mafraq',
];

const categories = Object.values(ProductCategory);
const statuses = Object.values(OrderStatus);

function padded(index: number) {
  return String(index).padStart(2, '0');
}

function seedEmail(index: number) {
  return `seed.user${padded(index)}@${SEED_EMAIL_DOMAIN}`;
}

function seedSku(index: number) {
  return `${SEED_SKU_PREFIX}-${padded(index)}`;
}

async function clearSeedOrders() {
  const orders = await prisma.order.findMany({
    where: {
      orderEmail: {
        startsWith: 'seed.user',
      },
    },
    select: {
      orderId: true,
      orderLine: {
        select: {
          id: true,
        },
      },
    },
  });

  const orderIds = orders.map((order) => order.orderId);
  const orderLineIds = orders
    .map((order) => order.orderLine?.id)
    .filter((id): id is number => id !== undefined);

  if (orderLineIds.length > 0) {
    await prisma.orderItem.deleteMany({
      where: {
        orderLineId: {
          in: orderLineIds,
        },
      },
    });

    await prisma.orderLine.deleteMany({
      where: {
        id: {
          in: orderLineIds,
        },
      },
    });
  }

  if (orderIds.length > 0) {
    await prisma.order.deleteMany({
      where: {
        orderId: {
          in: orderIds,
        },
      },
    });
  }
}

async function seedUsers(password: string) {
  const users: User[] = [];

  for (let index = 1; index <= SEED_COUNT; index += 1) {
    const firstName = firstNames[(index - 1) % firstNames.length];
    const lastName = lastNames[(index - 1) % lastNames.length];
    const phoneNumber = `079${String(1000000 + index).slice(1)}`;
    const governate = governates[(index - 1) % governates.length];

    const user = await prisma.user.upsert({
      where: {
        email: seedEmail(index),
      },
      create: {
        email: seedEmail(index),
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        phoneNumber,
        password,
        role: 'USER',
        isVerified: true,
      },
      update: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        phoneNumber,
        password,
        role: 'USER',
        isVerified: true,
      },
    });

    await prisma.userProfile.upsert({
      where: {
        userId: user.id,
      },
      create: {
        userId: user.id,
        governate,
        address: `Seed Street ${index}, Building ${10 + index}`,
      },
      update: {
        governate,
        address: `Seed Street ${index}, Building ${10 + index}`,
      },
    });

    await prisma.cart.upsert({
      where: {
        userId: user.id,
      },
      create: {
        userId: user.id,
      },
      update: {},
    });

    users.push(user);
  }

  return users;
}

async function seedProducts() {
  const products: Product[] = [];

  for (let index = 1; index <= SEED_COUNT; index += 1) {
    const category = categories[(index - 1) % categories.length];
    const product = await prisma.product.upsert({
      where: {
        productSku: seedSku(index),
      },
      create: {
        productName: `Seed Product ${padded(index)}`,
        productSubTitle: `Seed subtitle ${padded(index)}`,
        productPrice: (8 + index * 1.75).toFixed(2),
        productSize: 50 + (index % 6) * 25,
        stockQuantity: 25 + index,
        productSku: seedSku(index),
        productDescription: `Demo catalog item ${index} for development and testing.`,
        productCategory: [category],
        productStatus: productStatus.ACTIVE,
        productImage: `/uploads/products/seed-product-${padded(index)}.jpg`,
        productImages: [`/uploads/products/seed-product-${padded(index)}.jpg`],
        productShades: index % 3 === 0 ? ['#f4e7dd', '#d8b99d', '#7a513c'] : [],
      },
      update: {
        productName: `Seed Product ${padded(index)}`,
        productSubTitle: `Seed subtitle ${padded(index)}`,
        productPrice: (8 + index * 1.75).toFixed(2),
        productSize: 50 + (index % 6) * 25,
        stockQuantity: 25 + index,
        productDescription: `Demo catalog item ${index} for development and testing.`,
        productCategory: [category],
        productStatus: productStatus.ACTIVE,
        productImage: `/uploads/products/seed-product-${padded(index)}.jpg`,
        productImages: [`/uploads/products/seed-product-${padded(index)}.jpg`],
        productShades: index % 3 === 0 ? ['#f4e7dd', '#d8b99d', '#7a513c'] : [],
      },
    });

    products.push(product);
  }

  return products;
}

async function seedOrders(
  users: Awaited<ReturnType<typeof seedUsers>>,
  products: Awaited<ReturnType<typeof seedProducts>>,
) {
  for (let index = 1; index <= SEED_COUNT; index += 1) {
    const user = users[index - 1];
    const status = statuses[(index - 1) % statuses.length];
    const firstProduct = products[index - 1];
    const secondProduct = products[index % products.length];

    await prisma.order.create({
      data: {
        userId: user.id,
        orderEmail: user.email,
        orderPhoneNumber: user.phoneNumber,
        orderFirstName: user.firstName,
        orderLastName: user.lastName,
        orderGovernate: governates[(index - 1) % governates.length],
        orderAddress: `Seed Street ${index}, Building ${10 + index}`,
        canceled: status === OrderStatus.CANCELLED,
        orderStatus: status,
        orderLine: {
          create: {
            products: {
              create: [
                {
                  productId: firstProduct.productId,
                  productName: firstProduct.productName,
                  productImage: firstProduct.productImage,
                  productPrice: firstProduct.productPrice,
                  productSize: firstProduct.productSize,
                  quantity: (index % 3) + 1,
                },
                {
                  productId: secondProduct.productId,
                  productName: secondProduct.productName,
                  productImage: secondProduct.productImage,
                  productPrice: secondProduct.productPrice,
                  productSize: secondProduct.productSize,
                  quantity: 1,
                },
              ],
            },
          },
        },
      },
    });
  }
}

async function main() {
  const password = await bcrypt.hash('Password123!', 10);

  await clearSeedOrders();

  const users = await seedUsers(password);
  const products = await seedProducts();
  await seedOrders(users, products);

  console.log(
    `Seeded ${SEED_COUNT} users, ${SEED_COUNT} products, and ${SEED_COUNT} orders.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
