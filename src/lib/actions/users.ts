'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const SUPER_ADMIN_ROLES = new Set(['super_admin'])
const ADMIN_ROLES       = new Set(['super_admin', 'admin'])

export type AppRole = 'super_admin' | 'admin' | 'reception' | 'agent' | 'housekeeping'

async function requireAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('ไม่ได้เข้าสู่ระบบ')
  const role = user.app_metadata?.role as string | undefined
  if (!ADMIN_ROLES.has(role ?? '')) throw new Error('ไม่มีสิทธิ์')
}

function err(e: unknown): { error: string } {
  return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
}

export async function listUsers(): Promise<{
  users: { id: string; email: string; role: string; created_at: string; last_sign_in_at: string | null }[]
  currentRole: string | null
  error: string | null
}> {
  const supabase = await createClient()
  const { data: { user: me } } = await supabase.auth.getUser()
  const currentRole = (me?.app_metadata?.role as string | undefined) ?? null

  try { await requireAdmin() } catch (e) { return { users: [], currentRole, error: (e as Error).message } }

  const svc = createServiceClient()
  const { data, error } = await svc.auth.admin.listUsers({ perPage: 200 })
  if (error) return { users: [], currentRole, error: error.message }

  const users = data.users.map(u => ({
    id:              u.id,
    email:           u.email ?? '',
    role:            (u.app_metadata?.role as string | undefined) ?? '—',
    created_at:      u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
  }))

  return { users, currentRole, error: null }
}

export async function createUser(formData: FormData): Promise<{ error: string | null }> {
  try { await requireAdmin() } catch (e) { return err(e) }

  const email    = (formData.get('email')    as string).trim().toLowerCase()
  const password = (formData.get('password') as string)
  const role     = formData.get('role')     as AppRole
  if (!email || !password || !role) return { error: 'กรุณากรอกข้อมูลให้ครบ' }
  if (password.length < 8) return { error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }

  const svc = createServiceClient()
  const { error } = await svc.auth.admin.createUser({
    email,
    password,
    app_metadata:  { role },
    email_confirm: true,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return { error: null }
}

export async function updateUserRole(userId: string, role: AppRole): Promise<{ error: string | null }> {
  // Changing to super_admin requires current user to be super_admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }
  const currentRole = user.app_metadata?.role as string | undefined
  if (!ADMIN_ROLES.has(currentRole ?? '')) return { error: 'ไม่มีสิทธิ์' }
  if (role === 'super_admin' && !SUPER_ADMIN_ROLES.has(currentRole ?? '')) {
    return { error: 'เฉพาะ super_admin เท่านั้นที่สามารถกำหนดสิทธิ์นี้ได้' }
  }
  // Prevent self-demotion
  if (userId === user.id && role !== currentRole) {
    return { error: 'ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้' }
  }

  const svc = createServiceClient()
  const { error } = await svc.auth.admin.updateUserById(userId, { app_metadata: { role } })
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return { error: null }
}

export async function deleteUser(userId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }
  const currentRole = user.app_metadata?.role as string | undefined
  if (!ADMIN_ROLES.has(currentRole ?? '')) return { error: 'ไม่มีสิทธิ์' }
  if (userId === user.id) return { error: 'ไม่สามารถลบบัญชีของตัวเองได้' }

  const svc = createServiceClient()
  const { error } = await svc.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return { error: null }
}
