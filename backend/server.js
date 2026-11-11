const { execSync } = require('child_process');
const app = require('./src/app');
const { iniciarJobCancelamento } = require('./src/jobs/cancelamentoJob');
const { PrismaClient } = require('@prisma/client');

const PORT = process.env.PORT || 3333;
const prisma = new PrismaClient();

async function iniciarServidor() {
  try {
    console.log('🔄 Sincronizando o banco de dados com o Prisma...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    await Promise.all(
      Array.from({ length: 7 }, (_, diaSemana) =>
        prisma.horarioFuncionamento.upsert({
          where: { diaSemana },
          update: {},
          create: { diaSemana }
        })
      )
    );
    console.log('✅ Banco de dados sincronizado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao sincronizar o banco de dados:', error.message);
    process.exitCode = 1;
    return;
  }

  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    iniciarJobCancelamento();
  });
}

iniciarServidor();