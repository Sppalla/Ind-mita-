import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CartItem } from '../types/cart'

const STORAGE_KEY = '@indomita/cart_v1'

function getStoredCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(getStoredCart)
  const [isOpen, setIsOpen] = useState(false)
  const [badgeBump, setBadgeBump] = useState(false)

  // Persistência no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // ignore write errors in private browsing / storage full
    }
  }, [items])

  const triggerBump = useCallback(() => {
    setBadgeBump(true)
    const timer = setTimeout(() => setBadgeBump(false), 500)
    return () => clearTimeout(timer)
  }, [])

  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])
  const toggleCart = useCallback(() => setIsOpen(prev => !prev), [])

  const addItem = useCallback(
    (item: Omit<CartItem, 'quantity' | 'id'> & { id?: string; quantity?: number }) => {
      const quantityToAdd = item.quantity ?? 1
      const itemId = item.id || `${item.productId}-${item.size || 'padrao'}-${item.color || 'unica'}`

      setItems(current => {
        const index = current.findIndex(i => i.id === itemId)
        if (index >= 0) {
          const updated = [...current]
          updated[index] = {
            ...updated[index],
            quantity: updated[index].quantity + quantityToAdd,
          }
          return updated
        }
        return [
          ...current,
          {
            ...item,
            id: itemId,
            size: item.size || 'M',
            color: item.color || 'Padrão',
            quantity: quantityToAdd,
          },
        ]
      })

      triggerBump()
      setIsOpen(true)
    },
    [triggerBump]
  )

  const updateQuantity = useCallback((id: string, delta: number) => {
    setItems(current =>
      current
        .map(item => {
          if (item.id === id) {
            const nextQuantity = item.quantity + delta
            return nextQuantity > 0 ? { ...item, quantity: nextQuantity } : null
          }
          return item
        })
        .filter((item): item is CartItem => item !== null)
    )
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(current => current.filter(item => item.id !== id))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }, [items])

  const subtotalCents = useMemo(() => {
    return items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0)
  }, [items])

  return {
    items,
    isOpen,
    badgeBump,
    openCart,
    closeCart,
    toggleCart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    totalCount,
    subtotalCents,
  }
}
