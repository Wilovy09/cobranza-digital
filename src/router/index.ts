import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/facturas',
      name: 'facturas-list',
      component: () => import('@/views/facturas/FacturasListView.vue'),
    },
    {
      path: '/facturas/nueva',
      name: 'factura-nueva',
      component: () => import('@/views/facturas/FacturaFormView.vue'),
    },
    {
      path: '/facturas/:id',
      name: 'factura-detalle',
      component: () => import('@/views/facturas/FacturaFormView.vue'),
    },
    {
      path: '/plantillas',
      name: 'plantillas-list',
      component: () => import('@/views/plantillas/PlantillasListView.vue'),
    },
    {
      path: '/plantillas/nueva',
      name: 'plantilla-nueva',
      component: () => import('@/views/plantillas/PlantillaEditorView.vue'),
    },
    {
      path: '/plantillas/:id',
      name: 'plantilla-editar',
      component: () => import('@/views/plantillas/PlantillaEditorView.vue'),
    },
    {
      path: '/perfil',
      name: 'perfil',
      component: () => import('@/views/ProfileView.vue'),
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.ready) {
    await auth.init()
  }

  const isAuthenticated = !!auth.session

  if (to.name !== 'login' && !isAuthenticated) {
    return { name: 'login' }
  }

  if (to.name === 'login' && isAuthenticated) {
    return { name: 'home' }
  }
})

export default router
