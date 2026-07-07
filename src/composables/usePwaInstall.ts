import { onMounted, onUnmounted, ref } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isChromeMobile(): boolean {
  const ua = navigator.userAgent
  const isMobile = /Android/.test(ua) || (/Mobi/.test(ua) && !/iPad/.test(ua))
  const isChrome = /Chrome\//.test(ua) && !/Edg\/|OPR\/|SamsungBrowser\//.test(ua)
  return isMobile && isChrome
}

export function usePwaInstall() {
  const canInstall = ref(false)
  let deferredEvent: BeforeInstallPromptEvent | null = null

  function onBeforeInstallPrompt(e: Event) {
    e.preventDefault()
    deferredEvent = e as BeforeInstallPromptEvent
    canInstall.value = isChromeMobile()
  }

  function onAppInstalled() {
    deferredEvent = null
    canInstall.value = false
  }

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.removeEventListener('appinstalled', onAppInstalled)
  })

  async function install() {
    if (!deferredEvent) return
    await deferredEvent.prompt()
    await deferredEvent.userChoice
    deferredEvent = null
    canInstall.value = false
  }

  return { canInstall, install }
}
