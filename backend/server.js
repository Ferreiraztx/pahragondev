const { execSync } = require('child_process');
const app = require('./src/app');
const { iniciarJobCancelamento } = require('./src/jobs/cancelamentoJob');

const PORT = process.env.PORT || 3333;

try {
  console.log('🔄 Sincronizando o banco de dados com o Prisma...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('✅ Banco de dados sincronizado com sucesso!');
} catch (error) {
  console.error('❌ Erro ao sincronizar o banco de dados:', error.message);
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  iniciarJobCancelamento();
});