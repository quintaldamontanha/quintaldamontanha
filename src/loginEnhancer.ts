import { supabase } from './lib/supabase'

const STYLE_ID = 'quinta-login-overrides'

function installStyles() {
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    html,body{
      background:#f4efe5!important;
      font-family:Inter,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important;
    }

    .login{
      min-height:100vh!important;
      background:#f4efe5!important;
      padding:24px!important;
    }

    .login form{
      width:min(430px,100%)!important;
      background:#fffaf2!important;
      border:1px solid #eadfcd!important;
      border-radius:24px!important;
      padding:30px 34px 34px!important;
      box-shadow:0 18px 55px rgba(74,45,29,.10)!important;
      font-family:Inter,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important;
    }

    .login form>.eyebrow.dark,
    .login form>h1,
    .login form>p:not(.eyebrow){
      display:none!important;
    }

    .login label{
      color:#4b3528!important;
      font-family:Inter,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important;
      font-size:13px!important;
      font-weight:500!important;
      letter-spacing:0!important;
    }

    .login input{
      border:1px solid #d8c9b6!important;
      background:#fff!important;
      color:#2f241d!important;
      font-family:Inter,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important;
      font-size:14px!important;
      font-weight:400!important;
      letter-spacing:0!important;
    }

    .login input:focus{
      outline:none!important;
      border-color:#bf7f32!important;
      box-shadow:0 0 0 3px rgba(191,127,50,.14)!important;
    }

    .password-wrap{
      position:relative;
      display:block;
    }

    .password-wrap input{
      width:100%!important;
      padding-right:48px!important;
    }

    .password-toggle{
      position:absolute!important;
      right:7px!important;
      top:50%!important;
      transform:translateY(-50%)!important;
      width:36px!important;
      height:36px!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      border-radius:8px!important;
      background:transparent!important;
      color:#694333!important;
      display:grid!important;
      place-items:center!important;
      cursor:pointer!important;
      font-family:Inter,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important;
      font-weight:400!important;
    }

    .password-toggle:hover{
      background:#f4eadc!important;
    }

    .password-toggle svg{
      width:21px;
      height:21px;
      display:block;
      pointer-events:none;
    }

    .login form>button[type='submit'],
    .login form>button:not(.password-toggle){
      background:#c89245!important;
      color:#2d231d!important;
      border:0!important;
      border-radius:10px!important;
      padding:13px 18px!important;
      font-family:Inter,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important;
      font-size:14px!important;
      font-weight:500!important;
      letter-spacing:0!important;
      line-height:1.2!important;
    }

    .login form>button[type='submit']:hover,
    .login form>button:not(.password-toggle):hover{
      filter:brightness(.98);
    }

    .login form>button[type='submit']:disabled,
    .login form>button:not(.password-toggle):disabled{
      opacity:.65;
      cursor:not-allowed;
    }

    .login .error{
      margin-top:12px;
      background:#f8e8e4!important;
      color:#8e3428!important;
      border:1px solid #efcfc8;
      font-family:Inter,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important;
      font-size:13px!important;
      font-weight:400!important;
      line-height:1.4!important;
    }

    @media(max-width:520px){
      .login{
        padding:16px!important;
      }

      .login form{
        padding:25px 22px 28px!important;
      }
    }
  `

  document.head.appendChild(style)
}

function eyeIcon(visible: boolean) {
  return visible
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 002.8 2.8"/><path d="M9.9 4.2A10.7 10.7 0 0112 4c5 0 9 4 10 8a11.8 11.8 0 01-2 3.8"/><path d="M6.6 6.6C4.4 8 2.8 10 2 12c1 4 5 8 10 8 1.5 0 2.9-.4 4.2-1"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`
}

function ensureErrorBox(form: HTMLFormElement) {
  let box = form.querySelector<HTMLDivElement>('.error')

  if (!box) {
    box = document.createElement('div')
    box.className = 'error'

    const submit = form.querySelector<HTMLButtonElement>(
      'button[type="submit"],button:not([type])',
    )

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

  const passwordInput = form.querySelector<HTMLInputElement>('input[type="password"]')

  if (
    passwordInput &&
    !passwordInput.parentElement?.classList.contains('password-wrap')
  ) {
    const wrap = document.createElement('div')
    wrap.className = 'password-wrap'

    passwordInput.parentNode?.insertBefore(wrap, passwordInput)
    wrap.appendChild(passwordInput)

    const toggle = document.createElement('button')
    toggle.type = 'button'
    toggle.className = 'password-toggle'
    toggle.setAttribute('aria-label', 'Mostrar senha')
    toggle.title = 'Mostrar senha'
    toggle.innerHTML = eyeIcon(false)

    toggle.addEventListener('click', () => {
      const willShow = passwordInput.type === 'password'

      passwordInput.type = willShow ? 'text' : 'password'
      toggle.innerHTML = eyeIcon(willShow)
      toggle.setAttribute(
        'aria-label',
        willShow ? 'Ocultar senha' : 'Mostrar senha',
      )
      toggle.title = willShow ? 'Ocultar senha' : 'Mostrar senha'
      passwordInput.focus()
    })

    wrap.appendChild(toggle)
  }
}

let authenticating = false

document.addEventListener(
  'submit',
  async event => {
    const form = event.target as HTMLFormElement

    if (!(form instanceof HTMLFormElement) || !form.closest('.login')) return

    event.preventDefault()
    event.stopImmediatePropagation()

    if (authenticating) return

    const email =
      form.querySelector<HTMLInputElement>('input[type="email"]')?.value.trim() ||
      ''

    const passwordLabel = Array.from(form.querySelectorAll('label')).find(label =>
      label.textContent?.includes('Senha'),
    )

    const password =
      passwordLabel?.querySelector<HTMLInputElement>('input')?.value || ''

    const submit = form.querySelector<HTMLButtonElement>(
      'button[type="submit"],button:not([type])',
    )

    const errorBox = ensureErrorBox(form)

    errorBox.style.display = 'none'
    errorBox.textContent = ''

    authenticating = true

    if (submit) {
      submit.disabled = true
      submit.textContent = 'Entrando...'
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (!error) {
      window.location.assign('/admin')
      return
    }

    const message = error.message.toLowerCase()

    if (message.includes('email not confirmed')) {
      errorBox.textContent =
        'Este usuário ainda está marcado como não confirmado no Supabase.'
    } else if (message.includes('invalid login credentials')) {
      errorBox.textContent = 'E-mail ou senha inválidos.'
    } else if (
      message.includes('rate') ||
      message.includes('security purposes')
    ) {
      errorBox.textContent = 'Aguarde alguns segundos e tente novamente.'
    } else {
      errorBox.textContent = error.message
    }

    errorBox.style.display = 'block'

    authenticating = false

    if (submit) {
      submit.disabled = false
      submit.textContent = 'Entrar'
    }
  },
  true,
)

const observer = new MutationObserver(enhanceLogin)

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
})

window.addEventListener('DOMContentLoaded', enhanceLogin)
setTimeout(enhanceLogin, 0)
