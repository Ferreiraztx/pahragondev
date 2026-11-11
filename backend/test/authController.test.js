const test = require('node:test')
const assert = require('node:assert/strict')

process.env.RESEND_PASS = 're_test_regression'

const { contaPodeAlterarSenha } = require('../src/controllers/authController')

test('permite troca de senha para contas locais', () => {
  assert.equal(contaPodeAlterarSenha({ authProvider: 'local' }), true)
})

test('bloqueia troca de senha para contas Google', () => {
  assert.equal(contaPodeAlterarSenha({ authProvider: 'google' }), false)
})
