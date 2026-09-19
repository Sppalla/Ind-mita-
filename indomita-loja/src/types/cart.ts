export interface CartItem {
  id: string
  productId: string
  name: string
  categoryName?: string | null
  priceCents: number
  imageUrl?: string | null
  size: string
  color: string
  quantity: number
}

export interface CartState {
  items: CartItem[]
  isOpen: boolean
  badgeBump: boolean
}
