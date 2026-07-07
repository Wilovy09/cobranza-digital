import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Template } from '@pdfme/common'
import { supabase } from '@/utils/supabase'

export interface Plantilla {
  id: string
  nombre: string
  schema: Template
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export const usePlantillasStore = defineStore('plantillas', () => {
  const plantillas = ref<Plantilla[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    const { data, error } = await supabase
      .from('plantillas')
      .select('*')
      .order('updated_at', { ascending: false })
    loading.value = false
    if (error) throw error
    plantillas.value = data as Plantilla[]
  }

  async function fetchById(id: string) {
    const { data, error } = await supabase.from('plantillas').select('*').eq('id', id).single()
    if (error) throw error
    return data as Plantilla
  }

  async function create(nombre: string, schema: Template) {
    const { data, error } = await supabase
      .from('plantillas')
      .insert({ nombre, schema })
      .select('*')
      .single()
    if (error) throw error
    return data as Plantilla
  }

  async function update(id: string, changes: { nombre?: string; schema?: Template }) {
    const { data, error } = await supabase
      .from('plantillas')
      .update(changes)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data as Plantilla
  }

  async function remove(id: string) {
    const { error } = await supabase.from('plantillas').delete().eq('id', id)
    if (error) throw error
  }

  return { plantillas, loading, fetchAll, fetchById, create, update, remove }
})
