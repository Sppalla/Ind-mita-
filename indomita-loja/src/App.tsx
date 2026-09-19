import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useCart } from './hooks/useCart'
import { CartDrawer } from './components/CartDrawer'
import './App.css'

interface Product {
  id: string
  name: string
  description: string | null
  category_name: string | null
  price_cents: number
  image_url: string | null
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100)

export default function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const {
    items: cartItems,
    isOpen: isCartOpen,
    badgeBump,
    openCart,
    closeCart,
    addItem,
    updateQuantity,
    removeItem,
    totalCount,
    subtotalCents,
  } = useCart()

  useEffect(() => {
    void (async () => {
      if (supabase) {
        try {
          const { data } = await supabase
            .from('public_product_catalog')
            .select('*')
            .order('name')
          if (data && data.length > 0) {
            setProducts(data as Product[])
          }
        } catch {
          // fallback para demonstração
        }
      }
      setLoading(false)
    })()
  }, [])

  // Exibe produtos do banco ou peças demonstrativas da marca
  const displayItems: Product[] = products.length
    ? products
    : [
        {
          id: 'demo-1',
          name: 'Top Astral Terracota',
          description: 'Sustentação precisa com toque acetinado e costas cruzadas.',
          category_name: 'Top',
          price_cents: 18900,
          image_url: null,
        },
        {
          id: 'demo-2',
          name: 'Legging Essência Dourada',
          description: 'Cintura alta anatômica, compressão inteligente sem transparência.',
          category_name: 'Legging',
          price_cents: 28900,
          image_url: null,
        },
        {
          id: 'demo-3',
          name: 'Conjunto Movimento Puro',
          description: 'Look completo em tecido tecnológico termorregulador.',
          category_name: 'Conjunto',
          price_cents: 42900,
          image_url: null,
        },
        {
          id: 'demo-4',
          name: 'Faixa & Grip Studio',
          description: 'Acessório de alta performance para treinos funcionais e pilates.',
          category_name: 'Acessórios',
          price_cents: 9900,
          image_url: null,
        },
      ]

  return (
    <main>
      {/* Header Fixo com Blur e Acesso à Sacola */}
      <header className="site-header">
        <a className="logo" href="#inicio" aria-label="Indómita Home">
          indómita<sup>®</sup>
        </a>

        <nav aria-label="Navegação principal">
          <a href="#novidades">Novidades</a>
          <a href="#colecao">Coleção</a>
          <a href="#manifesto">Manifesto</a>
        </nav>

        <button
          type="button"
          className="bag"
          onClick={openCart}
          aria-label={`Abrir sacola com ${totalCount} ${totalCount === 1 ? 'item' : 'itens'}`}
        >
          Sacola
          <span className={badgeBump ? 'bump' : ''} aria-hidden="true">
            {totalCount}
          </span>
        </button>
      </header>

      {/* Hero Section com Arte Orgânica e Micro-animação */}
      <section id="inicio" className="hero">
        <div className="hero-copy">
          <h1>
            Moda que acompanha
            <br />
            o seu <em>movimento.</em>
          </h1>
          <p>
            Caimento refinado que vai além do treino, para você viver e sentir-se inteira
            em cada presença.
          </p>
          <a className="cta" href="#colecao">
            Explorar a coleção <span>↓</span>
          </a>
        </div>

        <div className="hero-art" aria-hidden="true">
          <img className="hero-mark" src="/logo-mark.png" alt="Símbolo Indómita" />
        </div>
      </section>

      {/* Seção Novidades */}
      <section id="novidades" className="welcome">
        <h2>
          Elegância para
          <br />
          <em>quem não para.</em>
        </h2>
        <p>
          A Indómita nasce do encontro entre a leveza e a precisão de um ateliê com a
          potência de um estúdio de movimento feminino contemporâneo.
        </p>
      </section>

      {/* Seção Coleção com Grid Dinâmico e Ação Rápida */}
      <section id="colecao" className="collection">
        <div className="section-title">
          <h2>Peças em movimento</h2>
          <p>
            Cada corte é modelado para oferecer liberdade absoluta, alta durabilidade e
            sofisticação estética.
          </p>
        </div>

        <div className="products">
          {loading ? (
            <p>Carregando coleção...</p>
          ) : (
            displayItems.map((item, index) => (
              <article key={item.id} className="product-card">
                <div className="product-image-container">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} loading="lazy" />
                  ) : (
                    <div className="placeholder">
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <p>
                        Sua peça
                        <br />
                        chega aqui
                      </p>
                    </div>
                  )}

                  {/* Ação rápida para adicionar à sacola com animação */}
                  <button
                    type="button"
                    className="quick-add-btn"
                    onClick={() =>
                      addItem({
                        productId: item.id,
                        name: item.name,
                        categoryName: item.category_name,
                        priceCents: item.price_cents > 0 ? item.price_cents : 18900,
                        imageUrl: item.image_url,
                        size: 'M',
                        color: 'Terracota',
                      })
                    }
                    aria-label={`Adicionar ${item.name} à sacola`}
                  >
                    <span>+</span> Adicionar à sacola
                  </button>
                </div>

                <div className="product-info">
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.description || item.category_name || 'Indómita'}</p>
                  </div>
                  {item.price_cents > 0 && <strong>{formatPrice(item.price_cents)}</strong>}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {/* Seção Manifesto */}
      <section id="manifesto" className="manifesto">
        <h2>
          Corpo livre.
          <br />
          <em>Mente indómita.</em>
        </h2>
        <p>Seu treino é seu território. Sua roupa também.</p>
      </section>

      {/* Rodapé da Loja */}
      <footer>
        <a className="logo" href="#inicio">
          indómita<sup>®</sup>
        </a>
        <p>Moda fitness para o seu movimento.</p>
        <a
          href="https://www.instagram.com/vestir.indomita?stkn=MW83bml5cWcwb215Mg=="
          target="_blank"
          rel="noreferrer"
        >
          Instagram ↗
        </a>
      </footer>

      {/* Gaveta Lateral da Sacola com Persistência Local */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={closeCart}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        subtotalCents={subtotalCents}
        totalCount={totalCount}
      />
    </main>
  )
}