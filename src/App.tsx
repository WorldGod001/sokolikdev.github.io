import { useState, useEffect } from 'react'
import { AdminPanel, WorkSection, type WorkProject } from './PortfolioAdmin'

const NAV_LINKS = ['about', 'work', 'contact']

const SKILLS = [
  'TypeScript', 'React', 'Next.js', 'Node.js',
  'Python', 'PostgreSQL', 'Redis', 'Docker',
  'GraphQL', 'Rust', 'Windows',
]

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(() => window.location.hash === '#admin')

  useEffect(() => {
    function syncView() {
      setIsAdmin(window.location.hash === '#admin')
    }

    window.addEventListener('hashchange', syncView)
    return () => window.removeEventListener('hashchange', syncView)
  }, [])

  useEffect(() => {
    if (isAdmin) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [isAdmin])

  return isAdmin ? <AdminPanel /> : <Portfolio />
}

function Portfolio() {
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [projects, setProjects] = useState<WorkProject[]>([])
  const isMobile = useIsMobile()

  useEffect(() => {
    fetch('/api/portfolio?resource=projects')
      .then((response) => response.ok ? response.json() : [])
      .then((items: WorkProject[]) => setProjects(items))
      .catch(() => setProjects([]))
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40)
      const sections = ['about', 'work', 'contact']
      for (const id of [...sections].reverse()) {
        const el = document.getElementById(id)
        if (el && window.scrollY >= el.offsetTop - 120) {
          setActiveSection(id)
          return
        }
      }
      setActiveSection('')
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const px = isMobile ? '20px' : '40px'
  const sectionPy = isMobile ? '80px' : '120px'

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", backgroundColor: '#0a0a0a', color: '#efefef', minHeight: '100vh' }}>
      {/* NAV */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: scrolled || menuOpen ? 'rgba(10,10,10,0.97)' : 'transparent',
          borderBottom: scrolled || menuOpen ? '1px solid #2a2a2a' : '1px solid transparent',
          transition: 'background-color 0.3s, border-color 0.3s',
          backdropFilter: scrolled || menuOpen ? 'blur(8px)' : 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: `0 ${px}`,
            height: '64px',
          }}
        >
          <a
            href="#"
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: '18px',
              color: '#efefef',
              textDecoration: 'none',
              letterSpacing: '-0.02em',
            }}
          >
            sokolik<span style={{ color: '#ff4500' }}>.dev</span>
          </a>

          {isMobile ? (
            <button
              onClick={() => setMenuOpen((o) => !o)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                padding: '8px',
              }}
              aria-label="Toggle menu"
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    display: 'block',
                    width: '22px',
                    height: '2px',
                    backgroundColor: '#efefef',
                    transition: 'transform 0.2s, opacity 0.2s',
                    transform:
                      menuOpen
                        ? i === 0 ? 'translateY(7px) rotate(45deg)'
                        : i === 2 ? 'translateY(-7px) rotate(-45deg)'
                        : 'none'
                        : 'none',
                    opacity: menuOpen && i === 1 ? 0 : 1,
                  }}
                />
              ))}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
              {NAV_LINKS.map((link) => (
                <a
                  key={link}
                  href={`#${link}`}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '12px',
                    color: activeSection === link ? '#ff4500' : '#888',
                    textDecoration: 'none',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => { if (activeSection !== link) (e.target as HTMLElement).style.color = '#efefef' }}
                  onMouseLeave={(e) => { if (activeSection !== link) (e.target as HTMLElement).style.color = '#888' }}
                >
                  {link}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Mobile dropdown menu */}
        {isMobile && menuOpen && (
          <div
            style={{
              padding: '16px 20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              borderTop: '1px solid #2a2a2a',
            }}
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href={`#${link}`}
                onClick={() => setMenuOpen(false)}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '13px',
                  color: activeSection === link ? '#ff4500' : '#888',
                  textDecoration: 'none',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {link}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* HERO */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: isMobile ? '0 20px 60px' : '0 40px 80px',
          borderBottom: '1px solid #2a2a2a',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(#2a2a2a 1px, transparent 1px), linear-gradient(90deg, #2a2a2a 1px, transparent 1px)',
            backgroundSize: '80px 80px',
            opacity: 0.25,
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: px,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            color: '#ff4500',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          ← available for work — 2026
        </div>

        <div style={{ position: 'relative', maxWidth: '1200px' }}>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '13px',
              color: '#888',
              letterSpacing: '0.1em',
              marginBottom: '24px',
              textTransform: 'uppercase',
            }}
          >
            Full-Stack Developer
          </p>

          <h1
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: isMobile ? 'clamp(52px, 16vw, 80px)' : 'clamp(64px, 12vw, 160px)',
              lineHeight: 0.9,
              letterSpacing: '-0.03em',
              margin: '0 0 40px',
              color: '#efefef',
            }}
          >
            SOKOLIK
            <span style={{ color: '#ff4500', display: 'inline-block' }}>.DEV</span>
          </h1>

          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '32px' : '48px',
              alignItems: isMobile ? 'flex-start' : 'flex-end',
            }}
          >
            <p
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: isMobile ? '16px' : '18px',
                fontWeight: 300,
                color: '#aaa',
                maxWidth: '480px',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              I build products that are fast, accessible, and honest.
              3 years shipping web apps people actually want to use.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
              <a
                href="#contact"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '13px',
                  padding: '14px 28px',
                  backgroundColor: '#ff4500',
                  color: '#0a0a0a',
                  textDecoration: 'none',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ff6a30' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ff4500' }}
              >
                Contact
              </a>
              <a
                href="#about"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '13px',
                  padding: '14px 28px',
                  backgroundColor: 'transparent',
                  color: '#efefef',
                  textDecoration: 'none',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  border: '1px solid #2a2a2a',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#efefef' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a' }}
              >
                About me
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" style={{ padding: `${sectionPy} ${px}`, borderBottom: '1px solid #2a2a2a' }}>
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '48px' : '80px',
            alignItems: 'start',
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                color: '#ff4500',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '32px',
              }}
            >
              02 / About
            </p>
            <h2
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: 'clamp(36px, 5vw, 60px)',
                lineHeight: 1.0,
                letterSpacing: '-0.03em',
                marginBottom: '32px',
              }}
            >
              CODE AS<br />
              <span style={{ color: '#ff4500' }}>CRAFT.</span>
            </h2>
            <p style={{ fontSize: '16px', fontWeight: 300, color: '#aaa', lineHeight: 1.8, marginBottom: '20px' }}>
              I'm a full-stack developer based in Ukraine. I care deeply about performance,
              developer experience, and interfaces that disappear into usefulness.
            </p>
            <p style={{ fontSize: '16px', fontWeight: 300, color: '#aaa', lineHeight: 1.8 }}>
              When I'm not shipping features I'm reading about distributed systems, contributing
              to open source, and cooking things that take too long.
            </p>
          </div>

          <div>
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                color: '#888',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '24px',
              }}
            >
              Stack
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '48px' }}>
              {SKILLS.map((skill) => (
                <span
                  key={skill}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '12px',
                    padding: '6px 12px',
                    border: '1px solid #2a2a2a',
                    color: '#888',
                    letterSpacing: '0.04em',
                    transition: 'border-color 0.2s, color 0.2s',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = '#ff4500'
                    el.style.color = '#ff4500'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = '#2a2a2a'
                    el.style.color = '#888'
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', border: '1px solid #2a2a2a' }}>
              {[
                { label: 'Years exp', value: '3+' },
                { label: 'Projects shipped', value: '40+' },
                { label: 'Open source PRs', value: '120+' },
                { label: 'Cups of coffee', value: '∞' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    padding: isMobile ? '16px' : '24px',
                    borderRight: '1px solid #2a2a2a',
                    borderBottom: '1px solid #2a2a2a',
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Archivo Black', sans-serif",
                      fontSize: isMobile ? '28px' : '36px',
                      color: '#ff4500',
                      margin: '0 0 4px',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {stat.value}
                  </p>
                  <p
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                      color: '#555',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      margin: 0,
                    }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WORK */}
      <WorkSection projects={projects} isMobile={isMobile} sectionPy={sectionPy} px={px} />

      {/* CONTACT */}
      <section id="contact" style={{ padding: `${sectionPy} ${px}` }}>
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '48px' : '80px',
            alignItems: 'center',
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                color: '#ff4500',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '32px',
              }}
            >
              04 / Contact
            </p>
            <h2
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: isMobile ? 'clamp(36px, 12vw, 64px)' : 'clamp(40px, 6vw, 80px)',
                lineHeight: 0.95,
                letterSpacing: '-0.03em',
                marginBottom: '32px',
              }}
            >
              LET'S<br />
              <span style={{ color: '#ff4500' }}>BUILD</span><br />
              SOMETHING.
            </h2>
            <p style={{ fontSize: '16px', fontWeight: 300, color: '#aaa', lineHeight: 1.8, maxWidth: '400px' }}>
              Available for freelance projects and full-time roles.
              If it sounds interesting, reach out.
            </p>
          </div>

          <div>
            <div style={{ borderTop: '1px solid #2a2a2a' }}>
              {[
                { label: 'Email', value: 'animetopanimeshnik4@gmail.com', href: 'mailto:animetopanimeshnik4@gmail.com' },
                { label: 'Telegram', value: '@the_sokolik', href: 'https://t.me/the_sokolik' },
              ].map((link) => (
                <ContactRow key={link.label} isMobile={isMobile} {...link} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          padding: `24px ${px}`,
          borderTop: '1px solid #2a2a2a',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? '8px' : '0',
        }}
      >
        <span
          style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: '14px',
            color: '#333',
            letterSpacing: '-0.01em',
          }}
        >
          sokolik<span style={{ color: '#ff4500' }}>.dev</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              color: '#444',
              letterSpacing: '0.06em',
            }}
          >
            © 2026 — Ukraine
          </span>
        </div>
      </footer>
      <a href="#admin" className="admin-entry">Admin <span aria-hidden="true">↗</span></a>
    </div>
  )
}

function ContactRow({ label, value, href, isMobile }: { label: string; value: string; href: string; isMobile: boolean }) {
  const [hovered, setHovered] = useState(false)

  return (
    <a
      href={href}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 0',
        borderBottom: '1px solid #2a2a2a',
        textDecoration: 'none',
        gap: '12px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          color: '#555',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: isMobile ? '13px' : '15px',
          fontWeight: 400,
          color: hovered ? '#ff4500' : '#efefef',
          transition: 'color 0.2s',
          wordBreak: 'break-all',
          textAlign: 'right',
        }}
      >
        {value} {hovered && <span style={{ fontSize: '12px' }}>↗</span>}
      </span>
    </a>
  )
}
