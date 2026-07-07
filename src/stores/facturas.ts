import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'
import type { Divisa } from '@/utils/money'

export interface Factura {
  id: string
  plantilla_id: string | null
  cliente: string
  concepto: string
  monto_total: number
  divisa: Divisa
  estado: 'pendiente' | 'pagada'
  inputs: Record<string, string>
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface Movimiento {
  id: string
  factura_id: string
  monto: number
  metodo_pago: string | null
  nota: string | null
  created_by: string
  created_at: string
}

export const useFacturasStore = defineStore('facturas', () => {
  const facturas = ref<Factura[]>([])
  const loading = ref(false)

  async function fetchAll(limit?: number) {
    loading.value = true
    let query = supabase.from('facturas').select('*').order('updated_at', { ascending: false })
    if (limit) query = query.limit(limit)
    const { data, error } = await query
    loading.value = false
    if (error) throw error
    facturas.value = data as Factura[]
  }

  async function fetchById(id: string) {
    const { data, error } = await supabase.from('facturas').select('*').eq('id', id).single()
    if (error) throw error
    return data as Factura
  }

  async function fetchByPlantilla(plantillaId: string) {
    const { data, error } = await supabase
      .from('facturas')
      .select('*')
      .eq('plantilla_id', plantillaId)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data as Factura[]
  }

  async function remove(id: string) {
    const { error } = await supabase.from('facturas').delete().eq('id', id)
    if (error) throw error
  }

  async function fetchMovimientos(facturaId: string) {
    const { data, error } = await supabase
      .from('movimientos')
      .select('*')
      .eq('factura_id', facturaId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data as Movimiento[]
  }

  async function create(input: {
    cliente: string
    concepto: string
    monto_total: number
    divisa: Divisa
    plantilla_id?: string | null
    inputs?: Record<string, string>
  }) {
    const { data, error } = await supabase
      .from('facturas')
      .insert(input)
      .select('*')
      .single()
    if (error) throw error
    return data as Factura
  }

  async function updateInputs(id: string, inputs: Record<string, string>) {
    const { data, error } = await supabase
      .from('facturas')
      .update({ inputs })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data as Factura
  }

  async function addMovimiento(input: {
    factura_id: string
    monto: number
    metodo_pago?: string | null
    nota?: string | null
  }) {
    const { data, error } = await supabase
      .from('movimientos')
      .insert(input)
      .select('*')
      .single()
    if (error) throw error
    return data as Movimiento
  }

  function calcularSaldo(factura: Factura, movimientos: Movimiento[]) {
    return factura.monto_total + movimientos.reduce((acc, m) => acc + m.monto, 0)
  }

  return {
    facturas,
    loading,
    fetchAll,
    fetchById,
    fetchByPlantilla,
    fetchMovimientos,
    create,
    updateInputs,
    addMovimiento,
    remove,
    calcularSaldo,
  }
})
