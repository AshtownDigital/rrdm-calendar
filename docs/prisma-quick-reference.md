# Prisma Quick Reference Guide

This guide provides quick reference information for working with Prisma in the RRDM application.

## Common Commands

### Database Management

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Deploy migrations (for production)
npx prisma migrate deploy

# Pull schema from database
npx prisma db pull

# Push schema to database (development only)
npx prisma db push

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

### Database Utilities

```bash
# Validate database schema
npm run prisma:validate

# Seed database with initial data
npm run prisma:seed

# Backup Prisma schema
npm run prisma:backup
```

## Common Patterns

### Querying Data

```javascript
// Get all items
const items = await prisma.modelName.findMany();

// Get item by ID
const item = await prisma.modelName.findUnique({
  where: { id: itemId }
});

// Get items with filtering
const items = await prisma.modelName.findMany({
  where: {
    field1: value1,
    field2: { contains: value2 }
  }
});

// Get items with relations
const items = await prisma.modelName.findMany({
  include: {
    relation1: true,
    relation2: true
  }
});

// Get items with ordering
const items = await prisma.modelName.findMany({
  orderBy: {
    field: 'asc' // or 'desc'
  }
});

// Pagination
const items = await prisma.modelName.findMany({
  skip: 10,
  take: 20
});
```

### Creating Data

```javascript
// Create single item
const item = await prisma.modelName.create({
  data: {
    field1: value1,
    field2: value2,
    relation1: {
      connect: { id: relationId }
    }
  }
});

// Create multiple items
const items = await prisma.modelName.createMany({
  data: [
    { field1: value1, field2: value2 },
    { field1: value3, field2: value4 }
  ],
  skipDuplicates: true
});
```

### Updating Data

```javascript
// Update single item
const item = await prisma.modelName.update({
  where: { id: itemId },
  data: {
    field1: newValue1,
    field2: newValue2
  }
});

// Update multiple items
const result = await prisma.modelName.updateMany({
  where: {
    field1: oldValue1
  },
  data: {
    field1: newValue1
  }
});
```

### Deleting Data

```javascript
// Delete single item
const item = await prisma.modelName.delete({
  where: { id: itemId }
});

// Delete multiple items
const result = await prisma.modelName.deleteMany({
  where: {
    field1: value1
  }
});
```

### Transactions

```javascript
// Perform multiple operations in a transaction
const result = await prisma.$transaction(async (tx) => {
  const item1 = await tx.modelName1.create({
    data: { field1: value1 }
  });
  
  const item2 = await tx.modelName2.update({
    where: { id: item2Id },
    data: { field1: value2 }
  });
  
  return { item1, item2 };
});
```

## Troubleshooting

### Common Issues

1. **Schema Drift**: If you get errors about schema drift, run `npx prisma db pull` to update your schema from the database, or `npx prisma migrate dev` to apply your schema changes to the database.

2. **Connection Issues**: If you're having connection issues, check your DATABASE_URL in the .env file and make sure it's correctly formatted.

3. **Type Errors**: If you're getting type errors, make sure you've generated the Prisma client after making schema changes with `npx prisma generate`.

4. **Missing Tables/Columns**: If you're getting errors about missing tables or columns, check your schema.prisma file and make sure it matches the database structure. You can use `npm run prisma:validate` to validate the schema.

### Useful Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Prisma Examples](https://github.com/prisma/prisma-examples)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Client Reference](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
