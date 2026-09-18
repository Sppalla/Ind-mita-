import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

type Product = { id: string; name: string; description: string | null; category_name: string | null; price_cents: number; image_url: string | null }
const price = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value / 100)

export default function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { void (async () => { if (supabase) { const { data } = await supabase.from('public_product_catalog').select('*').order('name'); setProducts((data ?? []) as Product[]) }; setLoading(false) })() }, [])
  const items = products.length ? products.slice(0, 4) : Array.from({ length: 4 }, (_, i) => ({ id: `blank-${i}`, name: 'Nova peÃ§a', description: 'Em breve', category_name: 'IndÃ³mita', price_cents: 0, image_url: null }))
  return <main>
    <div className="announcement">FRETE GRÃTIS EM COMPRAS ACIMA DE R$ 299 <i>â€¢</i> DROP 01 CHEGANDO</div>
    <header><a className="logo" href="#inicio">indÃ³mita<sup>Â®</sup></a><nav><a href="#colecao">novidades</a><a href="#colecao">coleÃ§Ã£o</a><a href="#manifesto">manifesto</a></nav><div className="tools">âŒ• <button aria-label="Sacola">â™§<b>0</b></button></div></header>
    <section id="inicio" className="hero"><div className="hero-text"><p className="eyebrow">DROP 01 / 2026</p><h1>feita para<br />ir <em>alÃ©m.</em></h1><p className="hero-description">Movimento, potÃªncia e presenÃ§a. Moda fitness que acompanha a sua essÃªncia.</p><a className="button dark" href="#colecao">explorar a coleÃ§Ã£o <span>â†—</span></a></div><div className="campaign"><div className="ring one"/><div className="ring two"/><p>IMAGEM DA<br/>CAMPANHA<br/><small>EM BREVE</small></p><label>INDÃ“MITA<br/>MOVIMENTO 01</label></div></section>
    <section className="introduction"><p className="eyebrow">A INDÃ“MITA</p><h2>NÃ£o Ã© sÃ³ sobre vestir.<br/><em>Ã‰ sobre chegar inteira.</em></h2><p>PeÃ§as que respeitam o seu ritmo, desenhadas para mulheres que nÃ£o pedem licenÃ§a para ocupar espaÃ§o.</p></section>
    <section id="colecao" className="collection"><div className="heading"><div><p className="eyebrow">SELEÃ‡ÃƒO ATUAL</p><h2>peÃ§as em <em>movimento</em></h2></div><span>{products.length ? `${String(products.length).padStart(2, '0')} peÃ§as` : 'em construÃ§Ã£o'}</span></div><div className="grid">{loading ? <p>Carregando coleÃ§Ã£o...</p> : items.map((item, i) => <article key={item.id}><div className="photo">{item.image_url ? <img src={item.image_url} alt={item.name}/> : <div className="blank"><span>0{i + 1}</span><p>espaÃ§o para<br/>sua peÃ§a</p></div>}<b>{item.category_name ?? 'INDÃ“MITA'}</b></div><div className="product"><div><h3>{item.name}</h3><p>{item.description || 'Novo essencial IndÃ³mita'}</p></div>{item.price_cents > 0 && <strong>{price(item.price_cents)}</strong>}</div></article>)}</div><a className="button outline" href="#colecao">ver todas as peÃ§as <span>â†—</span></a></section>
    <section id="manifesto" className="manifesto"><p className="eyebrow">NOSSO MANIFESTO</p><h2>corpo livre.<br/><em>mente indÃ´mita.</em></h2><p>Seu treino Ã© seu territÃ³rio. Sua roupa tambÃ©m.</p></section>
    <footer><a className="logo" href="#inicio">indÃ³mita<sup>Â®</sup></a><p>MODA FITNESS PARA QUEM SE MOVE COM PROPÃ“SITO</p><a href="https://instagram.com" target="_blank" rel="noreferrer">instagram â†—</a></footer>
  </main>
}