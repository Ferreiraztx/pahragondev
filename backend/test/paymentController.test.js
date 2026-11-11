const test = require('node:test')
const assert = require('node:assert/strict')

process.env.RESEND_PASS = 're_test_regression'

const { pagamentoAprovadoNoPrazo } = require('../src/controllers/paymentController')

const booking = {
  id: 42,
  valorTotal: 100,
  createdAt: new Date('2026-01-01T10:00:00.000Z')
}

test('aceita pagamento aprovado encontrado pela referência dentro dos dez minutos', () => {
  const payment = {
    id: 'mp-123',
    status: 'approved',
    external_reference: '42',
    transaction_amount: 100,
    date_approved: '2026-01-01T10:09:59.000Z'
  }

  assert.equal(pagamentoAprovadoNoPrazo(payment, booking), true)
})

test('rejeita pagamento aprovado depois dos dez minutos', () => {
  const payment = {
    status: 'approved',
    external_reference: '42',
    transaction_amount: 100,
    date_approved: '2026-01-01T10:10:01.000Z'
  }

  assert.equal(pagamentoAprovadoNoPrazo(payment, booking), false)
})

test('rejeita pagamento com referência ou valor diferentes da reserva', () => {
  const payment = {
    status: 'approved',
    external_reference: '99',
    transaction_amount: 999,
    date_approved: '2026-01-01T10:05:00.000Z'
  }

  assert.equal(pagamentoAprovadoNoPrazo(payment, booking), false)
})
