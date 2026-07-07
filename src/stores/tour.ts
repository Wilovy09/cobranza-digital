import { ref } from 'vue'
import { defineStore } from 'pinia'

export type TourSegment =
  | 'navbar'
  | 'plantillas-list'
  | 'editor'
  | 'plantillas-list-done'
  | 'factura-form'
  | null

export const useTourStore = defineStore('tour', () => {
  const active = ref(false)
  const segment = ref<TourSegment>(null)

  function start() {
    active.value = true
    segment.value = 'navbar'
  }

  function goTo(next: TourSegment) {
    segment.value = next
  }

  function finish() {
    active.value = false
    segment.value = null
  }

  return { active, segment, start, goTo, finish }
})
