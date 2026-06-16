'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ADMIN_ROLES = new Set(['super_admin', 'admin'])

async function requireAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('ไม่ได้เข้าสู่ระบบ')
  const role = user.app_metadata?.role as string | undefined
  if (!ADMIN_ROLES.has(role ?? '')) throw new Error('ไม่มีสิทธิ์')
}

// ── Room Types ────────────────────────────────────────────────

export async function upsertRoomType(formData: FormData): Promise<void> {
  await requireAdmin()
  const id              = formData.get('id')              as string | null
  const name            = (formData.get('name') as string).trim()
  const price_per_night = parseInt(formData.get('price_per_night') as string, 10)
  const extra_bed_price = parseInt(formData.get('extra_bed_price') as string, 10)
  if (!name) return

  const svc = createServiceClient()
  if (id) {
    await svc.from('room_types').update({ name, price_per_night, extra_bed_price }).eq('id', id)
  } else {
    await svc.from('room_types').insert({ name, price_per_night, extra_bed_price })
  }
  revalidatePath('/admin/settings')
}

export async function toggleRoomTypeActive(id: string, is_active: boolean): Promise<void> {
  await requireAdmin()
  await createServiceClient().from('room_types').update({ is_active }).eq('id', id)
  revalidatePath('/admin/settings')
}

// ── Rooms ─────────────────────────────────────────────────────

export async function upsertRoom(formData: FormData): Promise<void> {
  await requireAdmin()
  const id           = formData.get('id')           as string | null
  const name         = (formData.get('name') as string).trim()
  const room_type_id = formData.get('room_type_id') as string
  if (!name || !room_type_id) return

  const svc = createServiceClient()
  if (id) {
    await svc.from('rooms').update({ name, room_type_id }).eq('id', id)
  } else {
    await svc.from('rooms').insert({ name, room_type_id })
  }
  revalidatePath('/admin/settings')
}

export async function toggleRoomActive(id: string, is_active: boolean): Promise<void> {
  await requireAdmin()
  await createServiceClient().from('rooms').update({ is_active }).eq('id', id)
  revalidatePath('/admin/settings')
}

// ── Doctors ───────────────────────────────────────────────────

export async function upsertDoctor(formData: FormData): Promise<void> {
  await requireAdmin()
  const id   = formData.get('id')   as string | null
  const name = (formData.get('name') as string).trim()
  if (!name) return

  const svc = createServiceClient()
  if (id) {
    await svc.from('doctors').update({ name }).eq('id', id)
  } else {
    await svc.from('doctors').insert({ name })
  }
  revalidatePath('/admin/settings')
}

export async function toggleDoctorActive(id: string, is_active: boolean): Promise<void> {
  await requireAdmin()
  await createServiceClient().from('doctors').update({ is_active }).eq('id', id)
  revalidatePath('/admin/settings')
}

// ── Staff ─────────────────────────────────────────────────────

export type StaffRole = 'super_admin' | 'admin' | 'agent' | 'reception' | 'housekeeping'

export async function upsertStaff(formData: FormData): Promise<void> {
  await requireAdmin()
  const id   = formData.get('id')   as string | null
  const name = (formData.get('name') as string).trim()
  const role = formData.get('role') as StaffRole
  if (!name || !role) return

  const svc = createServiceClient()
  if (id) {
    await svc.from('staff').update({ name, role }).eq('id', id)
  } else {
    await svc.from('staff').insert({ name, role })
  }
  revalidatePath('/admin/settings')
}

export async function toggleStaffActive(id: string, is_active: boolean): Promise<void> {
  await requireAdmin()
  await createServiceClient().from('staff').update({ is_active }).eq('id', id)
  revalidatePath('/admin/settings')
}

// ── Discounts ─────────────────────────────────────────────────

export async function upsertDiscount(formData: FormData): Promise<void> {
  await requireAdmin()
  const id      = formData.get('id')      as string | null
  const label   = (formData.get('label') as string).trim()
  const percent = parseInt(formData.get('percent') as string, 10)
  if (!label || ![0, 5, 10, 20, 100].includes(percent)) return

  const svc = createServiceClient()
  if (id) {
    await svc.from('discounts').update({ label, percent }).eq('id', id)
  } else {
    await svc.from('discounts').insert({ label, percent })
  }
  revalidatePath('/admin/settings')
}

export async function toggleDiscountActive(id: string, is_active: boolean): Promise<void> {
  await requireAdmin()
  await createServiceClient().from('discounts').update({ is_active }).eq('id', id)
  revalidatePath('/admin/settings')
}

// ── Cleaning Types ────────────────────────────────────────────

export async function upsertCleaningType(formData: FormData): Promise<void> {
  await requireAdmin()
  const id   = formData.get('id')   as string | null
  const name = (formData.get('name') as string).trim()
  if (!name) return

  const svc = createServiceClient()
  if (id) {
    await svc.from('cleaning_types').update({ name }).eq('id', id)
  } else {
    await svc.from('cleaning_types').insert({ name })
  }
  revalidatePath('/admin/settings')
}

export async function deleteCleaningType(id: string): Promise<void> {
  await requireAdmin()
  await createServiceClient().from('cleaning_types').delete().eq('id', id)
  revalidatePath('/admin/settings')
}
