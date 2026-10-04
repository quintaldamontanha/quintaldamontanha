import { supabase } from './lib/supabase'

const STYLE_ID = 'quinta-login-overrides'

function installStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    html, body { background:#f4efe5 !important; }
    .login { min-height:100vh !important; background:#f4efe5 !important; padding:24px !important; }
    .login form { width:min(430px,100%) !important; background:#fffaf2 !important; border:1px solid #eadfcd !important; border-radius:24px !important; padding:32px 34px 34px !important; box-shadow:0 18px 55px rgba(74,45,29,.10) !important; }
    .login form > .eyebrow.dark,
    .login form > h1,
    .login form > p:not(.eyebrow) { display:none !important; }
    .login-brand { display:flex; flex-direction:column; align-items:center; margin:0 auto 24px; color:#5f3325; text-align:center; }
    .login-brand svg { width:118px; height:96px; display:block; margin-bottom:6px; }
    .login-brand .brand-quintal { font-family:Georgia,serif; font-weight:800; font-size:31px; line-height:.9; letter-spacing:-1px; color:#5f3325; }
    .login-brand .brand-montanha { font-family:Georgia,serif; font-weight:800; font-size:40px; line-height:1; letter-spacing:-1.5px; color:#bf7f32; }
    .login-brand .brand-sub { margin-top:7px; font-size:9px; font-weight:800; letter-spacing:2px; color:#5f3325; text-transform:uppercase; }
    .login label { color:#4b3528 !important; }
    .login input { border:1px solid #d8c9b6 !important; background:#fff !important; color:#2f241d !important; }
    .login input:focus { outline:none !important; border-color:#bf7f32 !important; box-shadow:0 0 0 3px rgba(191,127,50,.14) !important; }
    .password-wrap { display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; }
    .password-wrap input { min-width:0; }
    .password-toggle { border:1px solid #d8c9b6 !important; background:#fff !important; color:#5f3325 !important; border-radius:10px !important; padding:11px 12px !important; cursor:pointer !important; font-weight:700 !important; width:auto !important; margin:0 !important; }
    .login form > button[type='submit'], .login form > button:not(.password-toggle) { background:#c89245 !important; color:#2d231d !important; border:0 !important; border-radius:12px !important; padding:14px 18px !important; font-weight:800 !important; }
    .login .error { margin-top:12px; background:#f8e8e4 !important; color:#8e3428 !important; border:1px solid #efcfc8; }
    @media (max-width:520px) {
      .login { padding:16px !important; }
      .login form { padding:26px 22px 28px !important; }
      .login-brand .brand-quintal { font-size:27px; }
      .login-brand .brand-montanha { font-size:35px; }
    }
  `
  document.head.appendChild(style)
}

function brandMarkup() {
  return `
    <svg viewBox="0 0 140 112" aria-hidden="true">
      <path d="M70 5 113 21l18 43-18 35-43 10-43-10L9 64l18-43Z" fill="#5f3325"/>
      <path d="M70 13 106 27l15 37-15 29-36 8-36-8-15-29 15-37Z" fill="#c18137"/>
      <circle cx="70" cy="49" r="14" fill="none" stroke="#5f3325" stroke-width="6"/>
      <path d="M31 76 52 55l12 12 16-18 29 29-12 11-17-17-16 18-13-13-10 10Z" fill="#5f3325"/>
      <path d="M70 28v-8M50 34l-5-7M90 34l5-7M38 49h-9M102 49h9" stroke="#5f3325" stroke-width="5" stroke-linecap="round"/>
    </svg>
    <div class="brand-quintal">Quintal <span style="font-size:.55em;font-weight:700">da</span></div>
    <div class="brand-montanha">Montanha</div>
    <div class="brand-sub">Restaurante & Centro de Eventos</div>
  `
}

function ensureErrorBox(form: HTMLFormElement) {
  let box = form.querySelector<HTMLDivElement>('.error')
  if (!box) {
    box = document.createElement('div')
    box.className = 'error'
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"], button:not([type])')
    if (submit) form.insertBefore(box, submit)
    else form.appendChild(box)
  }
  return box
}

function enhanceLogin() {
  installStyles()
  const form = document.querySelector<HTMLFormElement>('.login form')
  if (!form || form.dataset.enhanced === 'true') return
  form.dataset.enhanced = 'true'

  const brand = document.createElement('div')
  brand.className = 'login-brand'
  brand.innerHTML = brandMarkup()
  form.insertBefore(brand, form.firstChild)

  const passwordInput = form.querySelector<HTMLInputElement>('input[type="password"]')
  if (passwordInput && !passwordInput.parentElement?.classList.contains('password-wrap')) {
    const wrap = document.createElement('div')
    wrap.className = 'password-wrap'
    passwordInput.parentNode?.insertBefore(wrap, passwordInput)
    wrap.appendChild(passwordInput)

    const toggle = document.createElement('button')
    toggle.type = 'button'
    toggle.className = 'password-toggle'
    toggle.textContent = 'Mostrar'
    toggle.addEventListener('click', () => {
      const visible = passwordInput.type === 'text'
      passwordInput.type = visible ? 'password' : 'text'
      toggle.textContent = visible ? 'Mostrar' : 'Ocultar'
    })
    wrap.appendChild(toggle)
  }
}

let authenticating = false

document.addEventListener('submit', async (event) => {
  const form = event.target as HTMLFormElement
  if (!(form instanceof HTMLFormElement) || !form.closest('.login')) return

  event.preventDefault()
  event.stopImmediatePropagation()
  if (authenticating) return

  const email = form.querySelector<HTMLInputElement>('input[type="email"]')?.value.trim() || ''
  const password = form.querySelector<HTMLInputElement>('input[type="password"], input[type="text"]')?.value || ''
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"], button:not([type])')
  const errorBox = ensureErrorBox(form)
  errorBox.style.display = 'none'
  errorBox.textContent = ''

  authenticating = true
  if (submit) {
    submit.disabled = true
    submit.textContent = 'Entrando...'
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (!error) {
    window.location.assign('/admin')
    return
  }

  const message = error.message.toLowerCase()
  if (message.includes('email not confirmed')) {
    errorBox.textContent = 'Seu acesso já foi criado. Confirme o e-mail enviado pelo Supabase e tente novamente.'
  } else if (message.includes('invalid login credentials')) {
    errorBox.textContent = 'E-mail ou senha inválidos.'
  } else if (message.includes('rate') || message.includes('security purposes')) {
    errorBox.textContent = 'Aguarde alguns segundos e tente novamente. O acesso não será recriado.'
  } else {
    errorBox.textContent = error.message
  }
  errorBox.style.display = 'block'

  authenticating = false
  if (submit) {
    submit.disabled = false
    submit.textContent = 'Entrar'
  }
}, true)

const observer = new MutationObserver(enhanceLogin)
observer.observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('DOMContentLoaded', enhanceLogin)
setTimeout(enhanceLogin, 0)
