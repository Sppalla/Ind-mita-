import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

type ProductRow = {
  id: string
  name: string
  category: string
  price_cents: number
  stock: number
  status: string
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100)

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'publicado':
      return 'Publicado'
    case 'rascunho':
      return 'Rascunho'
    case 'arquivado':
      return 'Arquivado'
    default:
      return status
  }
}

const summary = [
  { label: 'Peças publicadas', value: '128', tone: 'bg-espresso text-white' },
  { label: 'Itens em falta', value: '12', tone: 'bg-[#F1E2D6] text-espresso' },
  { label: 'Pedidos ativos', value: '42', tone: 'bg-[#E6D0BD] text-espresso' },
  { label: 'Lucro bruto', value: 'R$ 18.4k', tone: 'bg-[#CDA06B] text-white' },
]

function App() {
  const [email, setEmail] = useState('equipe@indomita.com')
  const [password, setPassword] = useState('123456')
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) {
        return
      }

      const { data } = await supabase.auth.getSession()
      setIsLoggedIn(Boolean(data.session))
      if (data.session) {
        void loadProducts()
      }
    }

    void checkSession()
  }, [])

  const loadProducts = async () => {
    if (!supabase) {
      setError('Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no painel.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('products')
        .select('id, name, status, price_cents, category_id, categories(name), product_variants(stock)')

      if (fetchError) {
        throw fetchError
      }

      const mappedProducts = (data ?? []).map((product: any) => {
        const variants = Array.isArray(product.product_variants) ? product.product_variants : []
        const stockTotal = variants.reduce((sum: number, variant: any) => sum + Number(variant?.stock ?? 0), 0)

        return {
          id: product.id,
          name: product.name,
          category: product.categories?.name ?? 'Sem categoria',
          price_cents: Number(product.price_cents ?? 0),
          stock: stockTotal,
          status: getStatusLabel(product.status),
        }
      })

      setProducts(mappedProducts)
    } catch (err) {
      console.error(err)
      setError('Não foi possível carregar os produtos do painel.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!supabase) {
      setError('Configuração do Supabase ausente no painel.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw signInError
      }

      if (data.session) {
        setIsLoggedIn(true)
        await loadProducts()
      }
    } catch (err) {
      console.error(err)
      setError('Credenciais inválidas ou usuário sem acesso de equipe.')
      setIsLoggedIn(false)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    if (!supabase) {
      setIsLoggedIn(false)
      return
    }

    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setProducts([])
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand p-6 text-espresso">
        <div className="w-full max-w-md rounded-[2rem] border border-espresso/10 bg-white/70 p-8 shadow-soft backdrop-blur-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-espresso/20 bg-sand font-serif text-3xl">
              I
            </div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-espresso/60">Painel de equipe</p>
            <h1 className="mt-3 font-serif text-5xl">Indómita</h1>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-espresso/60">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-espresso/15 bg-sand px-4 py-3 outline-none focus:border-gold"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-espresso/60">Senha</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-espresso/15 bg-sand px-4 py-3 outline-none focus:border-gold"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => void handleLogin()}
            disabled={loading}
            className="mt-6 w-full rounded-full bg-espresso px-5 py-3 text-xs uppercase tracking-[0.22em] text-white shadow-soft"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="mt-5 text-center text-xs text-espresso/50">Acesso restrito à equipe da loja.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sand p-6 text-espresso">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between rounded-[2rem] border border-espresso/10 bg-white/60 p-5 shadow-soft">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-espresso/60">Dashboard</p>
            <h1 className="mt-2 font-serif text-5xl">Indómita</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full border border-espresso/10 bg-sand px-4 py-2 text-xs uppercase tracking-[0.18em] text-espresso/70">
              Loja online
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-full border border-espresso/20 bg-white px-4 py-2 text-xs uppercase tracking-[0.2em] text-espresso"
            >
              Sair
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          {summary.map((item) => (
            <div key={item.label} className={`rounded-[1.5rem] p-5 shadow-soft ${item.tone}`}>
              <div className="text-[10px] uppercase tracking-[0.24em] opacity-80">{item.label}</div>
              <div className="mt-4 font-serif text-4xl">{item.value}</div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-espresso/10 bg-white/60 p-5 shadow-soft">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-espresso/60">Catálogo</p>
                <h2 className="mt-2 font-serif text-4xl">Produtos</h2>
              </div>
              <button className="rounded-full bg-gold px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] text-white">
                Novo produto
              </button>
            </div>

            {error ? (
              <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            ) : (
              <div className="overflow-hidden rounded-[1.5rem] border border-espresso/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-sand text-espresso/70">
                    <tr>
                      <th className="px-4 py-3 font-medium">Nome</th>
                      <th className="px-4 py-3 font-medium">Preço</th>
                      <th className="px-4 py-3 font-medium">Estoque</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-espresso/60">
                          Carregando produtos...
                        </td>
                      </tr>
                    ) : products.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-espresso/60">
                          Nenhum produto cadastrado.
                        </td>
                      </tr>
                    ) : (
                      products.map((product) => (
                        <tr key={product.id} className="border-t border-espresso/10">
                          <td className="px-4 py-3">
                            <div className="font-medium text-espresso">{product.name}</div>
                            <div className="text-xs text-espresso/60">{product.category}</div>
                          </td>
                          <td className="px-4 py-3">{formatPrice(product.price_cents)}</td>
                          <td className="px-4 py-3">{product.stock}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${
                              product.status === 'Publicado'
                                ? 'bg-[#E7F4EC] text-[#28714B]'
                                : product.status === 'Rascunho'
                                  ? 'bg-[#F8E5C6] text-[#825C1A]'
                                  : 'bg-[#F8D7D7] text-[#8A3B3B]'
                            }`}>
                              {product.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside className="rounded-[2rem] border border-espresso/10 bg-white/60 p-5 shadow-soft">
            <p className="text-[10px] uppercase tracking-[0.28em] text-espresso/60">Resumo</p>
            <h2 className="mt-2 font-serif text-4xl">Estoque</h2>

            <div className="mt-6 space-y-4">
              {[
                ['Vestuário', '74 itens'],
                ['Acessórios', '18 itens'],
                ['Sem estoque', '12 itens'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-[1rem] bg-sand px-4 py-3">
                  <span className="text-espresso/70">{label}</span>
                  <span className="font-medium text-espresso">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[1.5rem] bg-espresso p-5 text-white">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/70">Próximo foco</div>
              <div className="mt-3 font-serif text-3xl">Atualizar coleções</div>
              <p className="mt-2 text-sm text-white/75">Revisar peças de verão e ajustar preço de lançamento da coleção de treino.</p>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}

export default App
