import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

type Product = { id: string; name: string; description: string | null; category_name: string | null; price_cents: number; image_url: string | null }
const price = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100)

export default function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { void (async () => { if (supabase) { const { data } = await supabase.from('public_product_catalog').select('*').order('name'); setProducts((data ?? []) as Product[]) } setLoading(false) })() }, [])
  const items = products.length ? products.slice(0, 4) : Array.from({ length: 4 }, (_, index) => ({ id: `placeholder-${index}`, name: 'Nova peça', description: 'Em breve', category_name: 'Indómita', price_cents: 0, image_url: null }))
  return <main>
    <header className="site-header"><a className="logo" href="#inicio" aria-label="Indómita">indómita<sup>®</sup></a><nav><a href="#novidades">Novidades</a><a href="#colecao">Coleção</a><a href="#manifesto">Manifesto</a></nav><button className="bag" aria-label="Sacola">Sacola <span>0</span></button></header>
    <section id="inicio" className="hero"><div className="hero-copy"><h1>Moda que acompanha<br/>o seu <em>movimento.</em></h1><p>Caimento refinado que vai além do treino, para você viver e sentir-se inteira em cada presença.</p><a className="cta" href="#colecao">Explorar a coleção</a></div><div className="hero-art" aria-hidden="true"><svg viewBox="0 0 520 480" fill="none"><path d="M111 389C46 274 112 92 261 64c122-23 224 56 210 177-12 105-92 184-204 194-66 6-124-11-156-46Z"/><path d="M174 146c40-46 114-61 164-30 56 35 67 109 32 165-33 53-105 84-168 55-55-25-77-108-28-190Z"/><path d="M152 328c64-60 143-86 246-79M194 381c59-31 114-44 180-40"/></svg></div></section>
    <section id="novidades" className="welcome"><h2>Elegância para<br/><em>quem não para.</em></h2><p>Indómita nasce do encontro entre a leveza de um ateliê e a força de um estúdio de movimento.</p></section>
    <section id="colecao" className="collection"><div className="section-title"><h2>Peças em movimento</h2><p>Uma seleção pensada para acompanhar o seu ritmo.</p></div><div className="products">{loading ? <p>Carregando coleção...</p> : items.map((item, index) => <article key={item.id}><div className="product-image">{item.image_url ? <img src={item.image_url} alt={item.name}/> : <div className="placeholder"><span>{String(index + 1).padStart(2, '0')}</span><p>Sua peça<br/>chega aqui</p></div>}</div><div className="product-info"><div><h3>{item.name}</h3><p>{item.description || item.category_name || 'Indómita'}</p></div>{item.price_cents > 0 && <strong>{price(item.price_cents)}</strong>}</div></article>)}</div></section>
    <section id="manifesto" className="manifesto"><h2>Corpo livre.<br/><em>Mente indómita.</em></h2><p>Seu treino é seu território. Sua roupa também.</p></section>
    <footer><a className="logo" href="#inicio">indómita<sup>®</sup></a><p>Moda fitness para o seu movimento.</p><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a></footer>
  </main>
}