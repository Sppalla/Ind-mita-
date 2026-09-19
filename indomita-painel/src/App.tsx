import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

type Tab = 'catalog' | 'stock' | 'banners' | 'orders'
type Category = { id: string; name: string }
type Variant = { id?: string; size: string; color: string; sku: string; stock: number; is_active?: boolean }
type ProductImage = { id?: string; url: string; alt?: string; sort_order?: number }

type Product = {
  id: string
  name: string
  slug: string
  description: string | null
  category_id: string | null
  price_cents: number
  cost_cents: number
  status: 'rascunho' | 'publicado' | 'arquivado'
  categories?: { name: string } | null
  product_variants: Variant[]
  product_images: ProductImage[]
}

type Banner = {
  id: string
  image_url: string
  title: string | null
  link_url: string | null
  status: 'rascunho' | 'ativo' | 'inativo'
  starts_at: string
  ends_at: string | null
  sort_order: number
}

type Order = {
  id: string
  status: string
  total_cents: number
  created_at: string
  customers?: { full_name: string } | null
  order_items?: { quantity: number }[]
}

type ProductDraft = {
  id?: string
  name: string
  description: string
  category_id: string
  price: string
  cost: string
  status: Product['status']
  baseStock: number
  hasCustomVariants: boolean
  variants: Variant[]
  removedVariantIds: string[]
  images: ProductImage[]
  manualImageUrl: string
}

type BannerDraft = {
  id?: string
  image_url: string
  title: string
  link_url: string
  status: Banner['status']
  starts_at: string
  ends_at: string
  sort_order: number
}

const blankProduct = (): ProductDraft => ({
  name: '',
  description: '',
  category_id: '',
  price: '',
  cost: '',
  status: 'publicado',
  baseStock: 10,
  hasCustomVariants: false,
  variants: [],
  removedVariantIds: [],
  images: [],
  manualImageUrl: '',
})

const localDateTime = (value: string | Date) => {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const blankBanner = (): BannerDraft => ({
  image_url: '',
  title: '',
  link_url: '',
  status: 'ativo',
  starts_at: localDateTime(new Date()),
  ends_at: '',
  sort_order: 0,
})

const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

const toCents = (val: string) => {
  const value = val.trim().replace(/\s/g, '')
  return Math.round(Number(value.includes(',') ? value.replace(/\./g, '').replace(',', '.') : value) * 100)
}

const fromCents = (cents: number) =>
  (cents / 100).toFixed(2).replace('.', ',')

const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')


function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`status-badge ${value}`}>{value}</span>
}

export default function App() {
  const [sessionReady, setSessionReady] = useState(false)
  const [logged, setLogged] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tab, setTab] = useState<Tab>('catalog')

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [orders, setOrders] = useState<Order[]>([])

  const [productDraft, setProductDraft] = useState<ProductDraft | null>(null)
  const [bannerDraft, setBannerDraft] = useState<BannerDraft | null>(null)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const report = (msg: string, isError = false) => {
    if (isError) {
      setError(msg)
      setNotice('')
    } else {
      setNotice(msg)
      setError('')
    }
  }

  const loadData = async () => {
    if (!supabase) return
    setBusy(true)
    const [pRes, cRes, bRes, oRes] = await Promise.all([
      supabase
        .from('products')
        .select(
          'id,name,slug,description,category_id,price_cents,cost_cents,status,categories(name),product_variants(id,size,color,sku,stock,is_active),product_images(id,url,alt,sort_order)'
        )
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('id,name').eq('is_active', true).order('name'),
      supabase.from('banners').select('*').order('sort_order'),
      supabase
        .from('orders')
        .select('id,status,total_cents,created_at,customers(full_name),order_items(quantity)')
        .order('created_at', { ascending: false }),
    ])
    setBusy(false)

    if (pRes.error || cRes.error || bRes.error || oRes.error) {
      report('Não foi possível carregar todos os dados do painel.', true)
    }

    setProducts((pRes.data ?? []) as unknown as Product[])
    setCategories((cRes.data ?? []) as Category[])
    setBanners((bRes.data ?? []) as Banner[])
    setOrders((oRes.data ?? []) as unknown as Order[])
  }

  useEffect(() => {
    void (async () => {
      if (!supabase) {
        setSessionReady(true)
        return
      }
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        const { data: staff, error: staffError } = await supabase.rpc('is_staff')
        if (staff && !staffError) { setLogged(true); await loadData() }
        else report('Esta conta não tem acesso ao painel administrativo.', true)
      }
      setSessionReady(true)
    })()
  }, [])

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return report('Configure as variáveis do Supabase no ambiente.', true)
    setBusy(true)
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setBusy(false)
      return report(`Não foi possível autenticar: ${signInError.message}`, true)
    }
    const { data: staff, error: staffError } = await supabase.rpc('is_staff')
    if (!staff || staffError) {
      await supabase.auth.signOut()
      setBusy(false)
      return report('Esta conta não tem acesso ao painel administrativo.', true)
    }
    setLogged(true)
    setBusy(false)
    await loadData()
  }

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut()
    setLogged(false)
    setProducts([])
    setOrders([])
    setBanners([])
    setProductDraft(null)
    setBannerDraft(null)
  }

  // Upload para Supabase Storage
  const uploadFile = async (file: File, bucket: 'product-images' | 'banners') => {
    if (!supabase) throw new Error('Supabase não conectado.')
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const filePath = `${Date.now()}-${safeName}`
    const { error: uploadErr } = await supabase.storage.from(bucket).upload(filePath, file, {
      upsert: false,
    })
    if (uploadErr) throw uploadErr
    return supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl
  }

  const handleProductImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return
    try {
      setBusy(true)
      const urls = await Promise.all(files.map(f => uploadFile(f, 'product-images')))
      setProductDraft(d =>
        d
          ? {
              ...d,
              images: [
                ...d.images,
                ...urls.map((url, i) => ({ url, sort_order: d.images.length + i })),
              ],
            }
          : d
      )
      report('Imagem enviada com sucesso.')
    } catch {
      report('Falha no upload da imagem. Verifique as permissões do bucket.', true)
    } finally {
      setBusy(false)
      event.target.value = ''
    }
  }

  const openProductEditor = (prod?: Product) => {
    if (!prod) {
      setProductDraft(blankProduct())
      return
    }
    const activeVariants = prod.product_variants.filter(v => v.is_active !== false)
    const isSingleDefault =
      activeVariants.length === 1 &&
      activeVariants[0].size === 'Único' &&
      activeVariants[0].color === 'Padrão'

    setProductDraft({
      id: prod.id,
      name: prod.name,
      description: prod.description ?? '',
      category_id: prod.category_id ?? '',
      price: fromCents(prod.price_cents),
      cost: fromCents(prod.cost_cents),
      status: prod.status,
      baseStock: isSingleDefault ? activeVariants[0].stock : 10,
      hasCustomVariants: !isSingleDefault && activeVariants.length > 0,
      variants: isSingleDefault ? [] : activeVariants,
      removedVariantIds: [],
      images: [...prod.product_images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      manualImageUrl: '',
    })
  }

  const saveProduct = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || !productDraft) return
    if (!productDraft.name.trim()) return report('Informe o nome da peça.', true)

    setBusy(true)
    setError('')

    const productPayload = {
      name: productDraft.name.trim(),
      slug: slugify(productDraft.name),
      description: productDraft.description.trim() || null,
      category_id: productDraft.category_id || null,
      price_cents: toCents(productDraft.price),
      cost_cents: toCents(productDraft.cost),
      status: productDraft.status,
    }

    try {
      if (![productPayload.price_cents, productPayload.cost_cents].every(n => Number.isSafeInteger(n) && n >= 0)) {
        throw new Error('Informe preços válidos, maiores ou iguais a zero.')
      }
      const variants = productDraft.hasCustomVariants
        ? productDraft.variants
        : [{ size: 'Único', color: 'Padrão', sku: '', stock: productDraft.baseStock }]
      if (!variants.length || variants.some(v => !v.size.trim() || !v.color.trim() || !Number.isInteger(v.stock) || v.stock < 0)) {
        throw new Error('Informe tamanho, cor e estoque inteiro não negativo de cada variante.')
      }
      const images = [...productDraft.images]
      if (productDraft.manualImageUrl.trim()) images.push({ url: productDraft.manualImageUrl.trim() })
      const { error: saveError } = await supabase.rpc('save_catalog_product', {
        p_id: productDraft.id ?? null, p_product: productPayload,
        p_variants: variants, p_images: images,
      })
      if (saveError) throw saveError
      setProductDraft(null)
      await loadData()
      report('Peça salva com sucesso. Produtos publicados estão disponíveis no catálogo da loja.')
    } catch (err) {
      report(err instanceof Error ? err.message : (err as { message?: string })?.message || 'Não foi possível salvar a peça.', true)
    } finally {
      setBusy(false)
    }
  }

  const removeProduct = async (product: Product) => {
    if (!supabase || !confirm(`Deseja remover a peça “${product.name}”?`)) return
    const { data: hasOrders, error: historyError } = await supabase.rpc('product_has_order_history', {
      p_product_id: product.id,
    })
    if (historyError) return report(historyError.message, true)
    if (hasOrders) {
      const { error: archiveError } = await supabase.from('products').update({ status: 'arquivado' }).eq('id', product.id)
      if (archiveError) return report(archiveError.message, true)
      report(`A peça possui histórico de pedidos e foi arquivada com segurança.`)
    } else {
      const { error: delErr } = await supabase.from('products').delete().eq('id', product.id)
      if (delErr) return report(delErr.message, true)
      report(`Peça excluída do catálogo.`)
    }
    await loadData()
  }

  // Banners
  const saveBanner = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || !bannerDraft || !bannerDraft.image_url.trim()) {
      return report('Informe a imagem do banner.', true)
    }
    if (!bannerDraft.starts_at || !Number.isFinite(new Date(bannerDraft.starts_at).getTime())) return report('Informe uma data de início válida.', true)
    if (bannerDraft.ends_at && new Date(bannerDraft.ends_at) < new Date(bannerDraft.starts_at)) return report('O fim deve ser posterior ao início.', true)
    setBusy(true)
    const { data: authUser } = await supabase.auth.getUser()
    const bannerPayload = {
      image_url: bannerDraft.image_url.trim(),
      title: bannerDraft.title.trim() || null,
      link_url: bannerDraft.link_url.trim() || null,
      status: bannerDraft.status,
      starts_at: new Date(bannerDraft.starts_at).toISOString(),
      ends_at: bannerDraft.ends_at ? new Date(bannerDraft.ends_at).toISOString() : null,
      sort_order: Number(bannerDraft.sort_order) || 0,
      ...(bannerDraft.id ? {} : { created_by: authUser.user?.id }),
    }

    const res = bannerDraft.id
      ? await supabase.from('banners').update(bannerPayload).eq('id', bannerDraft.id)
      : await supabase.from('banners').insert(bannerPayload)

    setBusy(false)
    if (res.error) return report(res.error.message, true)
    setBannerDraft(null)
    report('Banner salvo com sucesso!')
    await loadData()
  }

  // Atualização rápida de estoque inline
  const updateStock = async (variant: Variant, newStock: number) => {
    if (!supabase || !variant.id) return
    if (!Number.isInteger(newStock) || newStock < 0) return report('Informe um estoque inteiro não negativo.', true)
    const { error: err } = await supabase
      .from('product_variants')
      .update({ stock: newStock })
      .eq('id', variant.id)
    if (err) report(err.message, true)
    else {
      report('Estoque atualizado.')
      await loadData()
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchName = !search || p.name.toLowerCase().includes(search.toLowerCase())
      const matchCat = !categoryFilter || p.category_id === categoryFilter
      const matchStatus = !statusFilter || p.status === statusFilter
      return matchName && matchCat && matchStatus
    })
  }, [products, search, categoryFilter, statusFilter])

  // Métricas
  const totalProducts = products.length
  const publishedCount = products.filter(p => p.status === 'publicado').length
  const totalCatalogValue = products.reduce((acc, p) => acc + p.price_cents, 0)
  const totalStockCount = products.reduce(
    (acc, p) =>
      acc +
      p.product_variants
        .filter(v => v.is_active !== false)
        .reduce((sum, v) => sum + Number(v.stock), 0),
    0
  )

  if (!sessionReady) {
    return (
      <div className="login-screen">
        <p>Carregando Painel Indómita…</p>
      </div>
    )
  }

  if (!logged) {
    return (
      <div className="login-screen">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="login-brand">
            <img src="/logo-mark.png" alt="Painel Indómita" />
            <p className="login-tag">Área Restrita · Equipe Indómita</p>
            <h1>Painel Indómita</h1>
            <p>Painel de controle e gestão da loja</p>
          </div>

          <Field label="E-mail de acesso">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu-email@indomita.com.br"
              required
            />
          </Field>

          <Field label="Senha">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>

          {error && <div className="alert-banner error">{error}</div>}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '10px' }}
            disabled={busy}
          >
            {busy ? 'Entrando…' : 'Entrar no painel ↗'}
          </button>
        </form>
      </div>
    )
  }

  const navItems: { key: Tab; label: string; icon: string }[] = [
    { key: 'catalog', label: 'Catálogo', icon: '▦' },
    { key: 'stock', label: 'Estoque', icon: '◫' },
    { key: 'banners', label: 'Banners', icon: '▤' },
    { key: 'orders', label: 'Pedidos', icon: '□' },
  ]

  return (
    <div className="admin-workspace">
      {/* Sidebar Oficial */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <img className="sidebar-logo" src="/logo-mark.png" alt="Painel Indómita" />
          <div>
            <div className="sidebar-brand-name">Painel Indómita</div>
            <span className="sidebar-brand-sub">Studio & Gestão</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.key}
              className={`sidebar-nav-item ${tab === item.key ? 'active' : ''}`}
              onClick={() => setTab(item.key)}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-status">
            <span className="status-dot" />
            <span>Equipe autenticada</span>
          </div>
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            Sair do painel ↗
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="admin-content">
        <header className="page-header">
          <div>
            <p className="page-tag">INDÓMITA / STUDIO</p>
            <h1>{navItems.find(item => item.key === tab)?.label}</h1>
          </div>

          {tab === 'catalog' && (
            <button className="btn-primary" onClick={() => openProductEditor()}>
              + Nova peça
            </button>
          )}

          {tab === 'banners' && (
            <button className="btn-primary" onClick={() => setBannerDraft(blankBanner())}>
              + Novo banner
            </button>
          )}
        </header>

        {notice && <div className="alert-banner success">{notice}</div>}
        {error && <div className="alert-banner error">{error}</div>}

        {/* ===================================================================
            ABA 1: CATÁLOGO
           =================================================================== */}
        {tab === 'catalog' && (
          <section>
            {/* Cards de Métricas */}
            <div className="metrics-grid">
              <div className="metric-card">
                <p className="metric-label">Peças Cadastradas</p>
                <div className="metric-value">{String(totalProducts).padStart(2, '0')}</div>
              </div>
              <div className="metric-card">
                <p className="metric-label">Publicadas na Loja</p>
                <div className="metric-value">{String(publishedCount).padStart(2, '0')}</div>
              </div>
              <div className="metric-card">
                <p className="metric-label">Valor em Catálogo</p>
                <div className="metric-value">{money(totalCatalogValue)}</div>
              </div>
              <div className="metric-card">
                <p className="metric-label">Itens em Estoque</p>
                <div className="metric-value">{totalStockCount}</div>
              </div>
            </div>

            {/* Barra de Filtros */}
            <div className="toolbar-wrap">
              <input
                className="toolbar-input"
                placeholder="Buscar por nome da peça..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />

              <select
                className="toolbar-select"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="">Todas as categorias</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className="toolbar-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">Todos os status</option>
                <option value="publicado">Publicado</option>
                <option value="rascunho">Rascunho</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>

            {/* Tabela de Produtos */}
            <div className="data-card">
              <div className="table-row head catalog-grid">
                <span>Produto</span>
                <span>Categoria</span>
                <span>Preço Venda</span>
                <span>Estoque</span>
                <span>Status</span>
                <span style={{ textAlign: 'right' }}>Ações</span>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="table-empty-state">
                  Nenhuma peça encontrada para os filtros selecionados.
                </div>
              ) : (
                filteredProducts.map(p => {
                  const stockSum = p.product_variants
                    .filter(v => v.is_active !== false)
                    .reduce((sum, v) => sum + Number(v.stock), 0)

                  return (
                    <div className="table-row catalog-grid" key={p.id}>
                      <div className="table-product-cell">
                        {p.product_images[0]?.url ? (
                          <img className="table-thumb" src={p.product_images[0].url} alt="" />
                        ) : (
                          <div className="table-thumb-placeholder">✦</div>
                        )}
                        <div className="table-product-info">
                          <b>{p.name}</b>
                          <small>{p.description || 'Sem descrição'}</small>
                        </div>
                      </div>

                      <span>{p.categories?.name ?? 'Sem categoria'}</span>
                      <strong style={{ color: 'var(--brown)' }}>{money(p.price_cents)}</strong>
                      <span>{stockSum} un.</span>
                      <StatusBadge value={p.status} />

                      <div className="row-actions">
                        <button className="action-link" onClick={() => openProductEditor(p)}>
                          Editar
                        </button>
                        <button
                          className="action-link danger"
                          onClick={() => void removeProduct(p)}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        )}

        {/* ===================================================================
            ABA 2: ESTOQUE
           =================================================================== */}
        {tab === 'stock' && (
          <section>
            <div className="data-card">
              <div className="table-row head stock-grid">
                <span>Produto</span>
                <span>Variação</span>
                <span>SKU</span>
                <span>Estoque</span>
                <span>Status</span>
              </div>

              {products.flatMap(prod =>
                prod.product_variants
                  .filter(v => v.is_active !== false)
                  .map(variant => (
                    <div className="table-row stock-grid" key={variant.id}>
                      <div className="table-product-cell">
                        <b>{prod.name}</b>
                      </div>
                      <span>
                        {variant.size} · {variant.color}
                      </span>
                      <code style={{ fontSize: '11px', color: 'var(--brown-soft)' }}>
                        {variant.sku}
                      </code>
                      <input
                        className="stock-inline-input"
                        type="number"
                        min="0"
                        defaultValue={variant.stock}
                        onBlur={e => void updateStock(variant, Number(e.target.value))}
                      />
                      <span style={{ fontSize: '12px', color: Number(variant.stock) === 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {Number(variant.stock) === 0 ? 'Zerado' : 'Disponível'}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </section>
        )}

        {/* ===================================================================
            ABA 3: BANNERS
           =================================================================== */}
        {tab === 'banners' && (
          <section>
            {banners.length === 0 ? (
              <div className="data-card table-empty-state">
                Nenhum banner cadastrado. Clique em “+ Novo banner” para criar.
              </div>
            ) : (
              <div className="banner-cards-grid">
                {banners.map(banner => (
                  <article className="banner-card-item" key={banner.id}>
                    <div className="banner-card-preview">
                      <img src={banner.image_url} alt={banner.title ?? 'Banner'} />
                    </div>
                    <div className="banner-card-details">
                      <StatusBadge value={banner.status} />
                      <h3>{banner.title || 'Sem título'}</h3>
                      <p>
                        Início: {new Date(banner.starts_at).toLocaleDateString('pt-BR')}
                        {banner.ends_at
                          ? ` · Fim: ${new Date(banner.ends_at).toLocaleDateString('pt-BR')}`
                          : ' · Vigência contínua'}
                      </p>
                      {banner.link_url && (
                        <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--gold-dark)' }}>
                          Link: {banner.link_url}
                        </p>
                      )}
                    </div>
                    <div className="banner-card-footer">
                      <button
                        className="btn-secondary"
                        onClick={() =>
                          setBannerDraft({
                            id: banner.id,
                            image_url: banner.image_url,
                            title: banner.title ?? '',
                            link_url: banner.link_url ?? '',
                            status: banner.status,
                            starts_at: localDateTime(banner.starts_at),
                            ends_at: banner.ends_at ? localDateTime(banner.ends_at) : '',
                            sort_order: banner.sort_order,
                          })
                        }
                      >
                        Editar banner
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ===================================================================
            ABA 4: PEDIDOS
           =================================================================== */}
        {tab === 'orders' && (
          <section>
            <div className="data-card">
              <div className="table-row head orders-grid">
                <span>Pedido</span>
                <span>Cliente</span>
                <span>Itens</span>
                <span>Total</span>
                <span>Status</span>
                <span>Data</span>
              </div>

              {orders.length === 0 ? (
                <div className="table-empty-state">Nenhum pedido recebido até o momento.</div>
              ) : (
                orders.map(order => (
                  <div className="table-row orders-grid" key={order.id}>
                    <b>#{order.id.slice(0, 8)}</b>
                    <span>{order.customers?.full_name ?? 'Cliente'}</span>
                    <span>
                      {order.order_items?.reduce((s, it) => s + it.quantity, 0) ?? 0} un.
                    </span>
                    <strong>{money(order.total_cents)}</strong>
                    <StatusBadge value={order.status} />
                    <span>{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      {/* Modal de Produto */}
      {productDraft && (
        <div className="modal-overlay">
          <form className="modal-dialog" onSubmit={saveProduct}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setProductDraft(null)}
            >
              ×
            </button>

            <h2>{productDraft.id ? 'Editar peça' : 'Nova peça'}</h2>

            <Field label="Nome da peça">
              <input
                value={productDraft.name}
                onChange={e => setProductDraft({ ...productDraft, name: e.target.value })}
                placeholder="Ex: Top Astral Terracota"
                required
              />
            </Field>

            <div className="form-grid-2">
              <Field label="Categoria">
                <select
                  value={productDraft.category_id}
                  onChange={e =>
                    setProductDraft({ ...productDraft, category_id: e.target.value })
                  }
                >
                  <option value="">Sem categoria</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Status de publicação">
                <select
                  value={productDraft.status}
                  onChange={e =>
                    setProductDraft({
                      ...productDraft,
                      status: e.target.value as Product['status'],
                    })
                  }
                >
                  <option value="publicado">Publicado (visível na loja)</option>
                  <option value="rascunho">Rascunho (oculto)</option>
                  <option value="arquivado">Arquivado</option>
                </select>
              </Field>
            </div>

            <div className="form-grid-2">
              <Field label="Preço de venda (R$)">
                <input
                  inputMode="decimal"
                  value={productDraft.price}
                  onChange={e => setProductDraft({ ...productDraft, price: e.target.value })}
                  placeholder="189,00"
                  required
                />
              </Field>

              <Field label="Preço de custo (R$) — interno, nunca exibido na loja">
                <input
                  inputMode="decimal"
                  value={productDraft.cost}
                  onChange={e => setProductDraft({ ...productDraft, cost: e.target.value })}
                  placeholder="75,00"
                />
              </Field>
            </div>

            <Field label="Descrição da peça">
              <textarea
                value={productDraft.description}
                onChange={e =>
                  setProductDraft({ ...productDraft, description: e.target.value })
                }
                placeholder="Detalhes sobre modelagem, toque do tecido e proposta de uso..."
              />
            </Field>

            {/* Gestão de Variações e Estoque */}
            <div className="modal-section-title">
              <h3>Variações e Estoque</h3>
              {!productDraft.hasCustomVariants ? (
                <button
                  type="button"
                  className="btn-add-variant"
                  onClick={() =>
                    setProductDraft({
                      ...productDraft,
                      hasCustomVariants: true,
                      variants: [
                        { size: 'P', color: 'Padrão', sku: '', stock: 0 },
                        { size: 'M', color: 'Padrão', sku: '', stock: 0 },
                      ],
                    })
                  }
                >
                  + Dividir em tamanhos / cores
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-add-variant"
                  onClick={() =>
                    setProductDraft({
                      ...productDraft,
                      variants: [
                        ...productDraft.variants,
                        { size: '', color: '', sku: '', stock: 0 },
                      ],
                    })
                  }
                >
                  + Adicionar tamanho/cor
                </button>
              )}
            </div>

            {!productDraft.hasCustomVariants ? (
              <Field label="Estoque inicial disponível (peça única)">
                <input
                  type="number"
                  min="0"
                  value={productDraft.baseStock}
                  onChange={e =>
                    setProductDraft({ ...productDraft, baseStock: Number(e.target.value) })
                  }
                />
              </Field>
            ) : (
              <div>
                {productDraft.variants.map((v, idx) => (
                  <div className="variant-row" key={v.id ?? idx}>
                    <input
                      placeholder="Tamanho (P, M...)"
                      value={v.size}
                      onChange={e => {
                        const updated = [...productDraft.variants]
                        updated[idx].size = e.target.value
                        setProductDraft({ ...productDraft, variants: updated })
                      }}
                      required
                    />
                    <input
                      placeholder="Cor"
                      value={v.color}
                      onChange={e => {
                        const updated = [...productDraft.variants]
                        updated[idx].color = e.target.value
                        setProductDraft({ ...productDraft, variants: updated })
                      }}
                      required
                    />
                    <input
                      placeholder="SKU (opcional)"
                      value={v.sku}
                      onChange={e => {
                        const updated = [...productDraft.variants]
                        updated[idx].sku = e.target.value
                        setProductDraft({ ...productDraft, variants: updated })
                      }}
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Estoque"
                      value={v.stock}
                      onChange={e => {
                        const updated = [...productDraft.variants]
                        updated[idx].stock = Number(e.target.value)
                        setProductDraft({ ...productDraft, variants: updated })
                      }}
                    />
                    <button
                      type="button"
                      className="variant-remove-btn"
                      onClick={() => {
                        const variantToRemove = productDraft.variants[idx]
                        setProductDraft({
                          ...productDraft,
                          variants: productDraft.variants.filter((_, i) => i !== idx),
                          removedVariantIds: variantToRemove.id
                            ? [...productDraft.removedVariantIds, variantToRemove.id]
                            : productDraft.removedVariantIds,
                        })
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Gestão de Imagens */}
            <div className="modal-section-title">
              <h3>Fotos da Peça</h3>
            </div>

            <div className="image-upload-area">
              <label className="upload-picker-label">
                <span>+ Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleProductImageUpload}
                />
              </label>

              {productDraft.images.map((img, idx) => (
                <div className="image-preview-item" key={img.url}>
                  <img src={img.url} alt="" />
                  <button
                    type="button"
                    className="image-preview-remove"
                    onClick={() =>
                      setProductDraft({
                        ...productDraft,
                        images: productDraft.images.filter((_, i) => i !== idx),
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <Field label="Ou insira a URL direta da imagem">
              <input
                type="url"
                placeholder="https://..."
                value={productDraft.manualImageUrl}
                onChange={e =>
                  setProductDraft({ ...productDraft, manualImageUrl: e.target.value })
                }
              />
            </Field>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', marginTop: '20px' }}
              disabled={busy}
            >
              {busy ? 'Salvando peça…' : 'Salvar peça ↗'}
            </button>
          </form>
        </div>
      )}

      {/* Modal de Banner */}
      {bannerDraft && (
        <div className="modal-overlay">
          <form className="modal-dialog" onSubmit={saveBanner}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setBannerDraft(null)}
            >
              ×
            </button>

            <h2>{bannerDraft.id ? 'Editar banner' : 'Novo banner'}</h2>

            <Field label="Título do banner">
              <input
                value={bannerDraft.title}
                onChange={e => setBannerDraft({ ...bannerDraft, title: e.target.value })}
                placeholder="Ex: Nova Coleção Inverno 2026"
              />
            </Field>

            <Field label="URL da Imagem do banner">
              <input
                type="url"
                value={bannerDraft.image_url}
                onChange={e => setBannerDraft({ ...bannerDraft, image_url: e.target.value })}
                placeholder="https://..."
                required
              />
            </Field>

            <Field label="Link de clique (opcional)">
              <input
                type="url"
                value={bannerDraft.link_url}
                onChange={e => setBannerDraft({ ...bannerDraft, link_url: e.target.value })}
                placeholder="https://loja.com.br/#colecao"
              />
            </Field>

            <div className="form-grid-2">
              <Field label="Status">
                <select
                  value={bannerDraft.status}
                  onChange={e =>
                    setBannerDraft({
                      ...bannerDraft,
                      status: e.target.value as Banner['status'],
                    })
                  }
                >
                  <option value="ativo">Ativo (visível)</option>
                  <option value="rascunho">Rascunho</option>
                  <option value="inativo">Inativo</option>
                </select>
              </Field>

              <Field label="Ordem de exibição">
                <input
                  type="number"
                  value={bannerDraft.sort_order}
                  onChange={e =>
                    setBannerDraft({ ...bannerDraft, sort_order: Number(e.target.value) })
                  }
                />
              </Field>
            </div>

            <div className="form-grid-2">
              <Field label="Início da exibição">
                <input
                  type="datetime-local"
                  value={bannerDraft.starts_at}
                  onChange={e =>
                    setBannerDraft({ ...bannerDraft, starts_at: e.target.value })
                  }
                />
              </Field>

              <Field label="Fim da exibição (opcional)">
                <input
                  type="datetime-local"
                  value={bannerDraft.ends_at}
                  onChange={e => setBannerDraft({ ...bannerDraft, ends_at: e.target.value })}
                />
              </Field>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', marginTop: '16px' }}
              disabled={busy}
            >
              {busy ? 'Salvando banner…' : 'Salvar banner ↗'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}