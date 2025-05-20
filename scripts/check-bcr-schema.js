/**
 * Check BCR Schema Script
 * 
 * This script checks the actual database schema for BCRs table
 * to understand what values are expected for enum fields
 */
require('dotenv').config({ path: '.env.development' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  try {
    console.log('Checking BCR schema in database...');
    
    // Query to get enum values directly from PostgreSQL
    const statusEnumQuery = await prisma.$queryRaw`
      SELECT 
        pg_type.typname AS enum_name,
        pg_enum.enumlabel AS enum_value
      FROM 
        pg_type 
        JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid
      WHERE 
        pg_type.typname = 'enum_bcrs_status'
      ORDER BY 
        pg_enum.enumsortorder;
    `;
    
    console.log('\nStatus Enum Values in Database:');
    if (statusEnumQuery && statusEnumQuery.length > 0) {
      statusEnumQuery.forEach(row => {
        console.log(`- ${row.enum_value}`);
      });
    } else {
      console.log('No enum values found for status');
    }
    
    // Query to get enum values for priority
    const priorityEnumQuery = await prisma.$queryRaw`
      SELECT 
        pg_type.typname AS enum_name,
        pg_enum.enumlabel AS enum_value
      FROM 
        pg_type 
        JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid
      WHERE 
        pg_type.typname = 'enum_bcrs_priority'
      ORDER BY 
        pg_enum.enumsortorder;
    `;
    
    console.log('\nPriority Enum Values in Database:');
    if (priorityEnumQuery && priorityEnumQuery.length > 0) {
      priorityEnumQuery.forEach(row => {
        console.log(`- ${row.enum_value}`);
      });
    } else {
      console.log('No enum values found for priority');
    }
    
    // Check the BCRs table structure
    const tableStructure = await prisma.$queryRaw`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM 
        information_schema.columns
      WHERE 
        table_name = 'Bcrs'
      ORDER BY 
        ordinal_position;
    `;
    
    console.log('\nBCRs Table Structure:');
    if (tableStructure && tableStructure.length > 0) {
      tableStructure.forEach(column => {
        console.log(`- ${column.column_name}: ${column.data_type} (${column.is_nullable === 'YES' ? 'nullable' : 'required'})`);
      });
    } else {
      console.log('Could not retrieve table structure');
    }
    
  } catch (error) {
    console.error('Error checking BCR schema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
