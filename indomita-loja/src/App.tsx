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
  available: boolean
}

type PublicVariant = { id: string; product_id: string; size: string; color: string; available: boolean }
type PublicBanner = { id: string; image_url: string; title: string | null; link_url: string | null }

const formatPrice = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100)

export default function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [variants, setVariants] = useState<PublicVariant[]>([])
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const [banners, setBanners] = useState<PublicBanner[]>([])
  const [bannerIndex, setBannerIndex] = useState(0)

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
    let cancelled = false
    const load = async () => {
      if (!supabase) {
        setLoadError('A coleção está temporariamente indisponível.')
        setLoading(false)
        return
      }
      try {
        const now = new Date().toISOString()
        const [catalog, choices, promos] = await Promise.all([
          supabase.from('public_product_catalog').select('*').order('name'),
          supabase.rpc('catalog_public_variants'),
          supabase.from('banners').select('id,image_url,title,link_url').eq('status', 'ativo')
            .lte('starts_at', now).or('ends_at.is.null,ends_at.gte.' + now).order('sort_order'),
        ])
        if (catalog.error || choices.error) throw catalog.error || choices.error
        if (!cancelled) {
          setProducts(catalog.data ?? [])
          setVariants(choices.data ?? [])
          setBanners(promos.data ?? [])
          setLoadError('')
        }
      } catch {
        if (!cancelled) setLoadError('Não foi possível carregar a coleção. Tente novamente em instantes.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    const refresh = () => { void load() }
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(refresh, 60000)
    return () => { cancelled = true; window.removeEventListener('focus', refresh); window.clearInterval(timer) }
  }, [])

  useEffect(() => {
    if (banners.length < 2) return
    const timer = window.setInterval(() => setBannerIndex(i => (i + 1) % banners.length), 6000)
    return () => window.clearInterval(timer)
  }, [banners.length])
  const banner = banners[bannerIndex % banners.length]
  const bannerLink = banner?.link_url && /^(https?:\/\/|\/(?!\/)|#)/i.test(banner.link_url) ? banner.link_url : undefined

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

      {banner && (
        <section className="promo-banner" aria-label="Promoções">
          <a href={bannerLink}><img src={banner.image_url} alt={banner.title || 'Promoção Indómita'} /></a>
          {banners.length > 1 && <div className="promo-controls">{banners.map((b, i) => (
            <button key={b.id} type="button" aria-label={'Ver promoção ' + (i + 1)} aria-pressed={i === bannerIndex % banners.length} onClick={() => setBannerIndex(i)}>{i + 1}</button>
          ))}</div>}
        </section>
      )}
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
          ) : loadError ? <p role="alert">{loadError}</p> : !products.length ? <p>Novas peças chegam em breve.</p> : (
            products.map((item, index) => {
              const choices = variants.filter(v => v.product_id === item.id)
              const selected = choices.find(v => v.id === selectedVariants[item.id]) || choices.find(v => v.available) || choices[0]
              return (
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
                    disabled={!item.available || !selected?.available}
                    onClick={() => selected?.available &&
                      addItem({
                        id: selected.id,
                        productId: item.id,
                        name: item.name,
                        categoryName: item.category_name,
                        priceCents: item.price_cents,
                        imageUrl: item.image_url,
                        size: selected.size,
                        color: selected.color,
                      })
                    }
                    aria-label={`Adicionar ${item.name} à sacola`}
                  >
                    {item.available && selected?.available ? '+ Adicionar à sacola' : 'Indisponível'}
                  </button>
                </div>

                {choices.length > 1 && <label className="variant-choice">Tamanho / cor
                  <select value={selected?.id || ''} onChange={e => setSelectedVariants(prev => ({ ...prev, [item.id]: e.target.value }))}>
                    {choices.map(v => <option key={v.id} value={v.id} disabled={!v.available}>{v.size} / {v.color}{v.available ? '' : ' — indisponível'}</option>)}
                  </select>
                </label>}
                <div className="product-info">
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.description || item.category_name || 'Indómita'}</p>
                  </div>
                  {item.price_cents > 0 && <strong>{formatPrice(item.price_cents)}</strong>}
                </div>
              </article>
            )})
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