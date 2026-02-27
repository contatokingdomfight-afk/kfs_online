#!/usr/bin/env node

/**
 * Gera um NEXTAUTH_SECRET aleatório seguro
 * 
 * Uso:
 *   node scripts/generate-nextauth-secret.js
 */

const crypto = require('crypto');

function generateSecret() {
  return crypto.randomBytes(32).toString('base64');
}

const secret = generateSecret();

console.log('\n🔑 NEXTAUTH_SECRET gerado com sucesso!\n');
console.log('Copie o valor abaixo e adicione às variáveis de ambiente da Vercel:\n');
console.log(`NEXTAUTH_SECRET=${secret}\n`);
console.log('⚠️  Guarde este valor num local seguro!\n');
