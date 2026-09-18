function App() {
  return (
    <div className="brand-page">
      <div className="brand-card">
        <div className="brand-figure" aria-label="Logo da Indómita">
          <svg viewBox="0 0 680 680" role="img" aria-hidden="true">
            <circle cx="340" cy="330" r="240" className="brand-ring" />
            <path d="M287 140c-40 16-72 46-98 92-36 62-34 127-12 171 23 46 72 76 126 82 56 7 118-15 158-71 40-56 55-140 26-209-26-63-86-104-160-115-19-3-31-2-40 0Z" className="brand-silhouette" fill="none" stroke="currentColor" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M360 198c-24-28-68-38-100-24-20 9-41 30-40 56 1 32 28 48 49 54 18 5 42 4 61-5 16-9 36-24 38-49 2-15-1-25-8-32Z" className="brand-silhouette" fill="none" stroke="currentColor" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M298 244c-22 15-38 38-51 64m81-38c6 15 13 38 20 61m-112 37c14 19 28 32 53 42m47-18c6 27 17 51 36 69" className="brand-silhouette" fill="none" stroke="currentColor" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M465 174c32 0 50 30 44 64-13 11-26 16-42 19-17 3-33-2-41-17 0-23 17-57 39-66Z" className="brand-accent" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M485 200c20 0 36 18 33 40-19 5-33 7-46 1-7-3-11-9-12-19 1-13 10-22 25-22Z" className="brand-accent" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M490 410c32-34 58-64 95-84" className="brand-silhouette" fill="none" stroke="currentColor" strokeWidth="3.8" strokeLinecap="round" />
            <path d="M498 448c29-18 46-32 69-58" className="brand-silhouette" fill="none" stroke="currentColor" strokeWidth="3.8" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className="brand-name">INDÓMITA</h1>
        <div className="brand-tagline">FORTE • LIVRE • IMPARÁVEL</div>

        <div className="contact-row">
          <div className="contact-tile">
            <div className="icon-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Zm0-8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" /></svg>
            </div>
            <div className="label">ENDEREÇO</div>
            <p>Rua General Marques, 483.<br />Sala 2 – Centro<br />São Borja – RS</p>
          </div>

          <div className="divider" aria-hidden="true" />

          <div className="contact-tile">
            <div className="icon-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h1.1c.7 0 1.3.4 1.6 1l.7 1.8a1.8 1.8 0 0 1-.5 2L10 8.4c.8 1.6 2.2 3 3.8 3.8l1.6-1.4a1.8 1.8 0 0 1 2-.5l1.8.7c.6.3 1 1 1 1.6v1.1A2.5 2.5 0 0 1 19.5 18h-1.1A14.4 14.4 0 0 1 4 6.6V5.5Z" /></svg>
            </div>
            <div className="label">TELEFONE</div>
            <p>(21) 98506-7171<br />(51) 99131-6559</p>
          </div>

          <div className="divider" aria-hidden="true" />

          <div className="contact-tile">
            <div className="icon-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M7 2.5A4.5 4.5 0 0 0 2.5 7v10A4.5 4.5 0 0 0 7 21.5h10A4.5 4.5 0 0 0 21.5 17V7A4.5 4.5 0 0 0 17 2.5H7Zm0 3.5h10a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm9.5 2.5a.8.8 0 0 1 .8.8v.5a.8.8 0 0 1-1.6 0v-.5a.8.8 0 0 1 .8-.8ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" /></svg>
            </div>
            <div className="label">INSTAGRAM</div>
            <p>@vestir.indomita</p>
          </div>
        </div>

        <div className="brand-footer">MODA FITNESS QUE ACOMPANHA A SUA ESSÊNCIA</div>
      </div>
    </div>
  )
}

export default App
