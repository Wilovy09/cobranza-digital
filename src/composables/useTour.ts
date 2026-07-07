import { driver, type Driver, type DriveStep } from 'driver.js'
import type { Router } from 'vue-router'
import 'driver.js/dist/driver.css'
import '@/assets/tour.css'
import { useTourStore } from '@/stores/tour'

let activeDriver: Driver | null = null

export function destroyTour() {
  activeDriver?.destroy()
  activeDriver = null
}

function runSteps(steps: DriveStep[]) {
  destroyTour()
  activeDriver = driver({
    showProgress: false,
    allowClose: true,
    overlayColor: '#10160f',
    onDestroyed: () => {
      activeDriver = null
    },
    steps,
  })
  activeDriver.drive()
}

/** Espera a que un elemento exista en el DOM (tras navegar de ruta). */
export function waitForElement(selector: string, timeout = 4000): Promise<Element | null> {
  return new Promise((resolve) => {
    const start = performance.now()
    function check() {
      const el = document.querySelector(selector)
      if (el) return resolve(el)
      if (performance.now() - start > timeout) return resolve(null)
      requestAnimationFrame(check)
    }
    check()
  })
}

export function startTour(router: Router) {
  const tour = useTourStore()
  tour.start()

  runSteps([
    {
      popover: {
        title: '¡Hola! 👋',
        description: 'Te explicaremos el uso de la plataforma.',
      },
    },
    {
      element: '#tour-nav-plantillas',
      popover: {
        title: 'Mis plantillas',
        description: 'Lo primero es crear una plantilla. Dale clic a "Siguiente" para ir ahí.',
        side: 'bottom',
        onNextClick: () => {
          tour.goTo('plantillas-list')
          router.push('/plantillas')
          destroyTour()
        },
      },
    },
  ])
}

export async function runPlantillasListTour(router: Router) {
  const tour = useTourStore()

  const el = await waitForElement('#tour-nueva-plantilla')
  if (!el) return

  runSteps([
    {
      element: '#tour-nueva-plantilla',
      popover: {
        title: 'Crear plantilla',
        description: 'Dale clic para abrir el editor de PDF.',
        side: 'bottom',
        onNextClick: () => {
          tour.goTo('editor')
          router.push('/plantillas/nueva')
          destroyTour()
        },
      },
    },
  ])
}

export async function runPlantillasListDoneTour(router: Router) {
  const tour = useTourStore()

  const el = await waitForElement('#tour-nav-factura')
  if (!el) return

  runSteps([
    {
      element: '#tour-nav-factura',
      popover: {
        title: 'Ya tienes tu plantilla',
        description: 'Ahora vamos a usarla para crear una factura.',
        side: 'bottom',
        onNextClick: () => {
          tour.goTo('factura-form')
          router.push('/facturas/nueva')
          destroyTour()
        },
      },
    },
  ])
}

export async function runEditorTour() {
  const canvas = await waitForElement('.editor__canvas')
  if (!canvas) return

  runSteps([
    {
      element: '.editor__canvas',
      popover: {
        title: 'El lienzo',
        description:
          'Aquí armas el diseño del PDF: arrastra bloques de texto, imagen o tabla desde el panel y ponlos donde quieras sobre la hoja.',
        side: 'right',
      },
    },
    {
      element: '.editor__help',
      popover: {
        title: 'Slugs especiales',
        description:
          'Este botón muestra los nombres de campo que se llenan solos: {cliente}, {concepto}, {total}, {saldo}, {fecha}. Ponle ese nombre exacto al "Name" de un campo de texto para que la factura lo llene automático.',
        side: 'bottom',
      },
    },
    {
      element: '.editor__toolbar input',
      popover: {
        title: 'Nombra tu plantilla',
        description: 'Ponle un nombre para poder encontrarla después.',
        side: 'bottom',
      },
    },
    {
      element: '.editor__toolbar .btn-primary',
      popover: {
        title: 'Guardar',
        description: 'Cuando termines tu diseño, dale clic aquí para guardar la plantilla.',
        side: 'bottom',
      },
    },
  ])
}

/** Se llama justo antes de guardar la plantilla, si el tour va en ese paso. */
export function onPlantillaGuardadaDuranteTour() {
  const tour = useTourStore()
  if (!tour.active || tour.segment !== 'editor') return
  destroyTour()
  tour.goTo('plantillas-list-done')
}

export async function runFacturaFormTour() {
  const tour = useTourStore()

  const el = await waitForElement('#tour-campo-cliente')
  if (!el) return

  runSteps([
    {
      element: '#tour-campo-cliente',
      popover: {
        title: 'Datos del cliente',
        description:
          'Escribe el nombre del cliente, el concepto (ej. "Paquete vacacional") y el monto total a cobrar.',
        side: 'right',
      },
    },
    {
      element: '#tour-select-plantilla',
      popover: {
        title: 'Elige tu plantilla',
        description:
          'Selecciona la plantilla que acabas de crear. Los campos con slugs se llenan solos; el resto te los pedirá abajo para llenarlos a mano.',
        side: 'right',
      },
    },
    {
      element: '#tour-crear-factura',
      popover: {
        title: 'Listo',
        description:
          'Crea la factura. Desde el detalle podrás generar el PDF y registrar abonos cada vez que el cliente pague.',
        side: 'top',
        onNextClick: () => {
          tour.finish()
          destroyTour()
        },
      },
    },
  ])
}
