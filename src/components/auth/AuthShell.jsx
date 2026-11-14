export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <aside className="auth-brand">
        <div><b>Regal</b><span>Plastic Surgery Centre</span></div>
        <p>Hospital management system</p>
        <small>Patient records are confidential. Sign in only with your own account.</small>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <h1>{title}</h1>
          {subtitle && <p className="muted" style={{ marginTop: 6 }}>{subtitle}</p>}
          {children}
          {footer && <div className="auth-footer">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
