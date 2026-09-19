import { useCallback, useEffect, useState } from 'react'
import type { CartItem } from '../types/cart'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
  items: CartItem[]
  onUpdateQuantity: (id: string, delta: number) => void
  onRemoveItem: (id: string) => void
  subtotalCents: number
  totalCount: number
}

const formatPrice = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

export function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  subtotalCents,
  totalCount,
}: CartDrawerProps) {
  const [checkoutNotice, setCheckoutNotice] = useState(false)

  const handleClose = useCallback(() => {
    setCheckoutNotice(false)
    onClose()
  }, [onClose])

  // Bloqueia rolagem da página de fundo quando a sacola está aberta
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Fecha com a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  if (!isOpen) return null

  return (
    <div className="cart-portal" role="dialog" aria-modal="true" aria-label="Sua Sacola">
      {/* Backdrop com desfoque e fade */}
      <div className="cart-backdrop" onClick={handleClose} aria-hidden="true" />

      {/* Gaveta lateral deslizante */}
      <aside className="cart-drawer">
        {/* Cabeçalho da Sacola */}
        <header className="cart-header">
          <div className="cart-title-wrap">
            <h2>Sua Sacola</h2>
            <span className="cart-count-pill">
              {totalCount} {totalCount === 1 ? 'peça' : 'peças'}
            </span>
          </div>
          <button
            type="button"
            className="cart-close-btn"
            onClick={handleClose}
            aria-label="Fechar sacola"
          >
            ×
          </button>
        </header>

        {/* Corpo da Sacola */}
        <div className="cart-body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <div className="empty-icon" aria-hidden="true">
                <span>✦</span>
              </div>
              <h3>Sua sacola está vazia</h3>
              <p>
                Nenhuma peça escolhida ainda. Descubra modelagens refinadas pensadas para
                acompanhar seu ritmo e movimento.
              </p>
              <button
                type="button"
                className="cart-explore-btn"
                onClick={() => {
                  handleClose()
                  const collectionSection = document.getElementById('colecao')
                  if (collectionSection) {
                    collectionSection.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
              >
                Explorar a coleção
              </button>
            </div>
          ) : (
            <ul className="cart-item-list">
              {items.map(item => (
                <li key={item.id} className="cart-item">
                  <div className="cart-item-image">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} />
                    ) : (
                      <div className="cart-item-placeholder">
                        <span>✦</span>
                      </div>
                    )}
                  </div>

                  <div className="cart-item-details">
                    <div className="cart-item-main">
                      <h4>{item.name}</h4>
                      <p className="cart-item-variant">
                        Tam. {item.size} {item.color ? `· ${item.color}` : ''}
                      </p>
                      <span className="cart-item-unit-price">
                        {formatPrice(item.priceCents)}
                      </span>
                    </div>

                    <div className="cart-item-actions">
                      <div className="quantity-stepper">
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          aria-label="Diminuir quantidade"
                        >
                          −
                        </button>
                        <span className="stepper-value">{item.quantity}</span>
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          aria-label="Aumentar quantidade"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="cart-item-remove"
                        onClick={() => onRemoveItem(item.id)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Rodapé com Subtotal e Ações */}
        {items.length > 0 && (
          <footer className="cart-footer">
            <div className="cart-subtotal-row">
              <span>Subtotal</span>
              <strong>{formatPrice(subtotalCents)}</strong>
            </div>

            <p className="cart-shipping-note">
              Frete e estimativa de entrega calculados na próxima etapa.
            </p>

            {checkoutNotice && (
              <div className="cart-phase1-notice">
                <span>✦</span>
                <p>
                  Sua sacola está salva! O checkout integrado com gateway de pagamento estará
                  disponível na Fase 2.
                </p>
              </div>
            )}

            <button
              type="button"
              className="cart-checkout-btn"
              onClick={() => setCheckoutNotice(true)}
            >
              Finalizar Pedido
            </button>

            <button
              type="button"
              className="cart-continue-btn"
              onClick={handleClose}
            >
              Continuar comprando
            </button>
          </footer>
        )}
      </aside>
    </div>
  )
}
