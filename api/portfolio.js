import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { BlobNotFoundError, del, get, head, list, put } from '@vercel/blob'
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'

const cookieName = 'portfolio_admin'
const sessionSeconds = 12 * 60 * 60
const attemptsWindow = 15 * 60 * 1000
const attempts = new Map()
const projectPrefix = 'portfolio/projects/'
const coverPrefix = 'portfolio/covers/'
const maxImageBytes = 5 * 1024 * 1024
const imageTypes = new Map([
  ['jpg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
  ['gif', 'image/gif'],
])
const idPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/

function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
}

function sha256(value) {
  return createHash('sha256').update(value).digest()
}

function sessionSignature(payload) {
  const { ADMIN_SESSION_SECRET, ADMIN_PASSWORD } = process.env
  return createHmac('sha256', ADMIN_SESSION_SECRET)
    .update(sha256(ADMIN_PASSWORD))
    .update(payload)
    .digest()
}

function authConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && (process.env.ADMIN_SESSION_SECRET?.length ?? 0) >= 32)
}

function isAdmin(request) {
  if (!authConfigured()) return false

  const cookie = request.headers.get('cookie')?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(cookieName + '='))
  const token = cookie?.slice(cookieName.length + 1) ?? ''
  const match = /^(\d{10})\.([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(token)
  if (!match) return false

  const [, expiry, nonce, signature] = match
  return Number(expiry) * 1000 > Date.now() &&
    timingSafeEqual(Buffer.from(signature, 'hex'), sessionSignature(expiry + '.' + nonce))
}

function sessionCookie(request, value, maxAge) {
  const secure = process.env.VERCEL || new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return cookieName + '=' + value + '; Path=/api; HttpOnly; SameSite=Strict; Max-Age=' + maxAge + secure
}

async function login(request) {
  if (!authConfigured()) return json({ error: 'Вход в админку ещё не настроен.' }, 503)

  const { password } = (await request.json()) ?? {}
  const address = request.headers.get('x-vercel-forwarded-for') ??
    request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local'
  const now = Date.now()
  const previous = attempts.get(address)
  const attempt = previous?.resetAt > now ? previous : { count: 0, resetAt: now + attemptsWindow }
  if (attempt.count >= 8) {
    return json({ error: 'Слишком много попыток. Попробуйте позже.' }, 429, {
      'Retry-After': String(Math.ceil((attempt.resetAt - now) / 1000)),
    })
  }

  if (typeof password !== 'string' || !timingSafeEqual(sha256(password), sha256(process.env.ADMIN_PASSWORD))) {
    if (attempts.size >= 1000) {
      for (const [key, entry] of attempts) {
        if (entry.resetAt <= now) attempts.delete(key)
      }
      if (attempts.size >= 1000) attempts.delete(attempts.keys().next().value)
    }
    attempt.count++
    attempts.set(address, attempt)
    return json({ error: 'Неверный пароль.' }, 401)
  }

  attempts.delete(address)
  const payload = (Math.floor(now / 1000) + sessionSeconds) + '.' + randomBytes(16).toString('hex')
  const token = payload + '.' + sessionSignature(payload).toString('hex')
  return json({ authenticated: true }, 200, { 'Set-Cookie': sessionCookie(request, token, sessionSeconds) })
}

function projectPath(id) {
  return projectPrefix + id + '.json'
}

async function readProject(pathname) {
  const blob = await get(pathname, { access: 'public' })
  return blob?.statusCode === 200 ? new Response(blob.stream).json() : null
}

async function readProjects() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return json([])

  const projects = []
  let cursor
  do {
    const page = await list({ prefix: projectPrefix, cursor, limit: 50 })
    const records = await Promise.all(page.blobs.map(({ pathname }) => readProject(pathname)))
    projects.push(...records.filter(Boolean))
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  projects.sort((a, b) => b.createdAt - a.createdAt)
  return json(projects.map(({ project }) => project))
}

async function publishProject(request) {
  const { id, extension, title, description, url } = (await request.json()) ?? {}
  if (typeof id !== 'string' || !idPattern.test(id) || !imageTypes.has(extension)) {
    return json({ error: 'Загрузите PNG, JPG, WebP или GIF до 5 МБ.' }, 400)
  }
  if (typeof title !== 'string' || !title.trim() || title.length > 80) {
    return json({ error: 'Укажите название (до 80 символов).' }, 400)
  }
  if (typeof description !== 'string' || !description.trim() || description.length > 500) {
    return json({ error: 'Добавьте описание (до 500 символов).' }, 400)
  }
  const link = typeof url === 'string' && url.length <= 2048 ? URL.parse(url) : null
  if (!link || !['https:', 'http:'].includes(link.protocol)) {
    return json({ error: 'Укажите ссылку на проект с http:// или https://.' }, 400)
  }

  const existing = await readProject(projectPath(id))
  if (existing) return json(existing.project)

  const cover = coverPrefix + id + '.' + extension
  let image
  try {
    image = await head(cover)
  } catch (error) {
    if (!(error instanceof BlobNotFoundError)) throw error
    return json({ error: 'Обложка ещё не загружена.' }, 400)
  }
  if (image.contentType !== imageTypes.get(extension) || !image.size || image.size > maxImageBytes) {
    return json({ error: 'Загрузите PNG, JPG, WebP или GIF до 5 МБ.' }, 400)
  }

  const project = { id, title: title.trim(), description: description.trim(), url: link.href, image: image.url }
  await put(projectPath(id), JSON.stringify({ project, createdAt: Date.now(), cover }), {
    access: 'public',
    contentType: 'application/json',
    allowOverwrite: false,
  })
  return json(project, 201)
}

async function deleteProject(id) {
  if (!idPattern.test(id)) return json({ error: 'Работа не найдена.' }, 404)
  const pathname = projectPath(id)
  const record = await readProject(pathname)
  if (!record) return json({ deleted: true })

  await del(pathname)
  try {
    await del(record.cover)
  } catch (error) {
    console.error('Could not delete portfolio cover', id, error.name)
  }
  return json({ deleted: true })
}

async function uploadCover(request) {
  const { type, payload } = (await request.json()) ?? {}
  if (type !== 'blob.generate-client-token' || typeof payload?.pathname !== 'string') {
    return json({ error: 'Некорректный запрос загрузки.' }, 400)
  }

  const { pathname } = payload
  const filename = pathname.startsWith(coverPrefix) ? pathname.slice(coverPrefix.length) : ''
  const parts = filename.split('.')
  const [id, extension] = parts
  if (parts.length !== 2 || !idPattern.test(id) || !imageTypes.has(extension)) {
    return json({ error: 'Некорректное имя обложки.' }, 400)
  }

  const clientToken = await generateClientTokenFromReadWriteToken({
    pathname,
    allowedContentTypes: [imageTypes.get(extension)],
    maximumSizeInBytes: maxImageBytes,
    validUntil: Date.now() + 5 * 60 * 1000,
    allowOverwrite: false,
  })
  return json({ type, clientToken })
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const resource = url.searchParams.get('resource')
    const { method } = request
    const sameOrigin = request.headers.get('origin') === url.origin
    try {
      if (method === 'GET' && resource === 'session') return json({ authenticated: isAdmin(request) })
      if (method === 'GET' && resource === 'projects') return await readProjects()
      if (!sameOrigin) return json({ error: 'Запрос с другого сайта отклонён.' }, 403)
      if (method === 'POST' && resource === 'login') return await login(request)
      if (method === 'POST' && resource === 'logout') {
        return json({ authenticated: false }, 200, { 'Set-Cookie': sessionCookie(request, '', 0) })
      }
      if (method === 'POST' && resource === 'upload') {
        if (!isAdmin(request)) return json({ error: 'Войдите в панель администратора.' }, 401)
        if (!process.env.BLOB_READ_WRITE_TOKEN) return json({ error: 'Подключите Vercel Blob к проекту.' }, 503)
        return await uploadCover(request)
      }
      if (resource === 'projects' && ['POST', 'DELETE'].includes(method)) {
        if (!isAdmin(request)) return json({ error: 'Войдите в панель администратора.' }, 401)
        if (!process.env.BLOB_READ_WRITE_TOKEN) return json({ error: 'Подключите Vercel Blob к проекту.' }, 503)
        return await (method === 'POST' ? publishProject(request) : deleteProject(url.searchParams.get('id')))
      }
      return json({ error: 'Маршрут не найден.' }, 404)
    } catch (error) {
      if (error instanceof SyntaxError) return json({ error: 'Некорректный запрос.' }, 400)
      console.error('Portfolio API error', resource, error.name)
      return json({ error: 'Не удалось выполнить запрос. Попробуйте ещё раз.' }, 500)
    }
  },
}
