// Script to check workflow phases
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const phases = await prisma.workflowPhase.findMany({
      orderBy: {
        order: 'asc'
      }
    });
    
    console.log('Current Workflow Phases:');
    console.log('------------------------');
    phases.forEach(phase => {
      console.log(`${phase.order}. ${phase.name} - Current: ${phase.currentStatus}, Completed: ${phase.completedStatus}`);
    });
    
    console.log(`\nTotal phases: ${phases.length}`);
  } catch (error) {
    console.error('Error fetching workflow phases:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
