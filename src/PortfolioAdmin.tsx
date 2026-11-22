import { upload } from '@vercel/blob/client'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'

export type WorkProject = {
  id: string
  title: string
  description: string
  url: string
  image: string
}

const api = '/api/portfolio?resource='
const maxImageBytes = 5 * 1024 * 1024
const imageExtensions = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
])

async function readResponse(response: Response) {
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Ошибка сервера.')
  return data
}

const mono: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  color: '#efefef',
  background: '#111',
  border: '1px solid #2a2a2a',
  outline: 'none',
  font: "400 14px 'Outfit', sans-serif",
}

async function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Не удалось прочитать изображение.'))
    reader.readAsDataURL(file)
  })
}

export function WorkSection({ projects, isMobile, sectionPy, px }: {
  projects: WorkProject[]
  isMobile: boolean
  sectionPy: string
  px: string
}) {
  return (
    <section id="work" style={{ padding: `${sectionPy} ${px}`, borderBottom: '1px solid #2a2a2a' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{ ...mono, fontSize: '11px', color: '#ff4500', margin: '0 0 28px' }}>03 / Selected work</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '24px', marginBottom: '48px' }}>
          <div>
            <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: isMobile ? 'clamp(38px, 12vw, 64px)' : 'clamp(48px, 7vw, 88px)', lineHeight: 0.95, letterSpacing: '-0.03em', margin: '0 0 16px' }}>
              THINGS I <span style={{ color: '#ff4500' }}>BUILT.</span>
            </h2>
            <p style={{ color: '#888', fontSize: '16px', fontWeight: 300, margin: 0 }}>A few projects, shipped with care.</p>
          </div>
          <span style={{ ...mono, fontSize: '11px', color: '#555', flexShrink: 0 }}>{String(projects.length).padStart(2, '0')} projects</span>
        </div>

        {projects.length === 0 ? (
          <div style={{ border: '1px solid #2a2a2a', padding: isMobile ? '28px 20px' : '40px', color: '#777', fontSize: '15px' }}>
            Projects are on their way. Check back soon.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: isMobile ? '28px' : '40px 24px' }}>
            {projects.map((project, index) => (
              <a
                key={project.id}
                href={project.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${project.title} in a new tab`}
                style={{ display: 'block', color: 'inherit', textDecoration: 'none', border: '1px solid #2a2a2a', background: '#0d0d0d', transition: 'border-color 0.2s, transform 0.2s' }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.borderColor = '#ff4500'
                  event.currentTarget.style.transform = 'translateY(-4px)'
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.borderColor = '#2a2a2a'
                  event.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div style={{ aspectRatio: '16 / 10', overflow: 'hidden', background: '#151515' }}>
                  <img src={project.image} alt={`${project.title} preview`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
                <div style={{ padding: isMobile ? '20px' : '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                  <div>
                    <p style={{ ...mono, fontSize: '10px', color: '#ff4500', margin: '0 0 10px' }}>0{index + 1} / Project</p>
                    <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '24px', letterSpacing: '-0.02em', margin: '0 0 10px' }}>{project.title}</h3>
                    <p style={{ color: '#999', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>{project.description}</p>
                  </div>
                  <span aria-hidden="true" style={{ fontSize: '20px', color: '#ff4500', flexShrink: 0 }}>↗</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [projects, setProjects] = useState<WorkProject[]>([])
  const [password, setPassword] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const uploadedCover = useRef<{ file: File; id: string } | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadProjects() {
    const response = await fetch(`${api}projects`)
    setProjects(await readResponse(response) as WorkProject[])
  }

  useEffect(() => {
    let active = true
    async function restoreSession() {
      try {
        const session = await readResponse(await fetch(`${api}session`))
        if (!active) return
        setAuthenticated(Boolean(session.authenticated))
        if (session.authenticated) {
          const items = await readResponse(await fetch(`${api}projects`))
          if (active) setProjects(items as WorkProject[])
        }
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : 'Сервер недоступен.')
      } finally {
        if (active) setChecking(false)
      }
    }

    void restoreSession()
    return () => { active = false }
  }, [])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(`${api}login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      await readResponse(response)
      setAuthenticated(true)
      setPassword('')
      await loadProjects()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось войти.')
    } finally {
      setBusy(false)
    }
  }

  async function handleImageChange(file: File | undefined) {
    uploadedCover.current = null
    setImageFile(file ?? null)
    setImagePreview('')
    if (!file) return
    if (!imageExtensions.has(file.type)) {
      setMessage('Выберите PNG, JPG, WebP или GIF.')
      setImageFile(null)
      return
    }
    if (file.size > maxImageBytes) {
      setMessage('Размер изображения должен быть не больше 5 МБ.')
      setImageFile(null)
      return
    }
    try {
      setImagePreview(await readImage(file))
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось прочитать изображение.')
    }
  }

  async function handleAddProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const extension = imageFile && imageExtensions.get(imageFile.type)
    if (!imageFile || !extension) {
      setMessage('Добавьте изображение проекта.')
      return
    }
    const link = URL.parse(url)
    if (!title.trim() || !description.trim() || !link || !['https:', 'http:'].includes(link.protocol)) {
      setMessage('Добавьте название, описание и ссылку с http:// или https://.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      let cover = uploadedCover.current
      if (cover?.file !== imageFile) {
        const id = crypto.randomUUID()
        await upload(`portfolio/covers/${id}.${extension}`, imageFile, {
          access: 'public',
          handleUploadUrl: `${api}upload`,
        })
        cover = { file: imageFile, id }
        uploadedCover.current = cover
      }
      const response = await fetch(`${api}projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cover.id, extension, title, description, url: link.href }),
      })
      if (response.status === 401) setAuthenticated(false)
      const result = await readResponse(response)
      setProjects((current) => [result as WorkProject, ...current.filter((project) => project.id !== result.id)])
      uploadedCover.current = null
      setTitle('')
      setDescription('')
      setUrl('')
      setImageFile(null)
      setImagePreview('')
      const fileInput = document.getElementById('work-image') as HTMLInputElement | null
      if (fileInput) fileInput.value = ''
      setMessage('Работа добавлена на сайт.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось добавить проект.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Удалить эту работу?')) return
    setMessage('')
    try {
      const response = await fetch(`${api}projects&id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (response.status === 401) setAuthenticated(false)
      await readResponse(response)
      setProjects((current) => current.filter((project) => project.id !== id))
      setMessage('Работа удалена.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось удалить работу.')
    }
  }

  async function handleLogout() {
    setMessage('')
    try {
      await readResponse(await fetch(`${api}logout`, { method: 'POST' }))
      setAuthenticated(false)
      setProjects([])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось выйти.')
    }
  }

  const page: CSSProperties = { minHeight: '100vh', background: '#0a0a0a', color: '#efefef', fontFamily: "'Outfit', sans-serif", padding: '32px 20px 80px' }
  const button: CSSProperties = { border: 0, padding: '14px 20px', background: '#ff4500', color: '#0a0a0a', font: "500 12px 'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }

  return (
    <main style={page}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', borderBottom: '1px solid #2a2a2a', paddingBottom: '24px', marginBottom: '48px' }}>
          <a href="#" style={{ color: '#efefef', textDecoration: 'none', fontFamily: "'Archivo Black', sans-serif", fontSize: '18px' }}>sokolik<span style={{ color: '#ff4500' }}>.dev</span></a>
          {authenticated && <button type="button" onClick={handleLogout} style={{ ...mono, background: 'none', border: '1px solid #2a2a2a', color: '#aaa', padding: '10px 14px', fontSize: '10px', cursor: 'pointer' }}>Log out</button>}
        </header>

        <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(38px, 8vw, 68px)', lineHeight: 0.95, letterSpacing: '-0.03em', margin: '0 0 16px' }}>WORK <span style={{ color: '#ff4500' }}>MANAGER.</span></h1>
        <p style={{ color: '#888', margin: '0 0 36px' }}>Добавляйте примеры работ — они сразу появятся в разделе Selected Work.</p>

        {checking ? <p style={{ color: '#888' }}>Загрузка…</p> : !authenticated ? (
          <form onSubmit={handleLogin} style={{ maxWidth: '480px', border: '1px solid #2a2a2a', padding: '28px' }}>
            <label htmlFor="admin-password" style={{ ...mono, display: 'block', fontSize: '10px', color: '#888', marginBottom: '12px' }}>Admin password</label>
            <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} style={fieldStyle} />
            <button type="submit" disabled={busy} style={{ ...button, marginTop: '16px', opacity: busy ? 0.6 : 1 }}>{busy ? 'Checking…' : 'Enter admin'}</button>
          </form>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 0.8fr)', gap: '48px', alignItems: 'start' }} className="admin-layout">
            <form onSubmit={handleAddProject} style={{ border: '1px solid #2a2a2a', padding: '28px', display: 'grid', gap: '20px' }}>
              <div>
                <label htmlFor="work-title" style={{ ...mono, display: 'block', fontSize: '10px', color: '#888', marginBottom: '10px' }}>Project name</label>
                <input id="work-title" required maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Project name" style={fieldStyle} />
              </div>
              <div>
                <label htmlFor="work-description" style={{ ...mono, display: 'block', fontSize: '10px', color: '#888', marginBottom: '10px' }}>Description</label>
                <textarea id="work-description" required maxLength={500} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Коротко о проекте и вашей роли" style={{ ...fieldStyle, resize: 'vertical' }} />
              </div>
              <div>
                <label htmlFor="work-url" style={{ ...mono, display: 'block', fontSize: '10px', color: '#888', marginBottom: '10px' }}>Project link</label>
                <input id="work-url" type="url" required maxLength={2048} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" style={fieldStyle} />
              </div>
              <div>
                <label htmlFor="work-image" style={{ ...mono, display: 'block', fontSize: '10px', color: '#888', marginBottom: '10px' }}>Cover image / max 5 MB</label>
                <input id="work-image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required onChange={(event) => void handleImageChange(event.target.files?.[0])} style={{ ...fieldStyle, padding: '10px', fontSize: '12px' }} />
                {imagePreview && <img src={imagePreview} alt="Project preview" style={{ display: 'block', width: '100%', maxHeight: '220px', objectFit: 'cover', marginTop: '12px', border: '1px solid #2a2a2a' }} />}
              </div>
              <button type="submit" disabled={busy} style={{ ...button, justifySelf: 'start', opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Add project +'}</button>
            </form>

            <section>
              <p style={{ ...mono, fontSize: '10px', color: '#888', margin: '0 0 16px' }}>Published / {projects.length}</p>
              {projects.length === 0 ? <p style={{ color: '#666', borderTop: '1px solid #2a2a2a', paddingTop: '20px' }}>Пока нет опубликованных работ.</p> : projects.map((project) => (
                <article key={project.id} style={{ display: 'flex', gap: '14px', borderTop: '1px solid #2a2a2a', padding: '16px 0', alignItems: 'center' }}>
                  <img src={project.image} alt="" style={{ width: '76px', height: '58px', objectFit: 'cover', background: '#151515' }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '16px', margin: '0 0 5px' }}>{project.title}</h2>
                    <a href={project.url} target="_blank" rel="noreferrer" style={{ color: '#888', fontSize: '12px', overflowWrap: 'anywhere' }}>{project.url}</a>
                  </div>
                  <button type="button" onClick={() => void handleDelete(project.id)} aria-label={`Delete ${project.title}`} style={{ ...mono, color: '#ff6a30', background: 'none', border: '1px solid #2a2a2a', padding: '8px', fontSize: '9px', cursor: 'pointer' }}>Delete</button>
                </article>
              ))}
            </section>
          </div>
        )}
        {message && <p role="status" style={{ marginTop: '20px', color: message.includes('добавлена') || message.includes('удалена') ? '#8fc49b' : '#ff8057' }}>{message}</p>}
        <style>{`@media (max-width: 720px) { .admin-layout { grid-template-columns: 1fr !important; gap: 40px !important; } }`}</style>
      </div>
    </main>
  )
}
