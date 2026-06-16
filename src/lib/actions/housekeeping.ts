'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const HK_ROLES = new Set(['super_admin', 'admin', 'housekeeping', 'reception'])

export async function updateCleaningType(
  bookingId: string,
  cleaningTypeId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  const role = user.app_metadata?.role as string | undefined
  if (!HK_ROLES.has(role ?? '')) return { error: 'ไม่มีสิทธิ์' }

  // The RPC is SECURITY DEFINER and re-checks the role internally.
  const { error } = await supabase.rpc('update_booking_cleaning_type', {
    p_booking_id:       bookingId,
    p_cleaning_type_id: cleaningTypeId,
  })

  if (error) return { error: error.message }
  revalidatePath('/housekeeping')
  return { error: null }
}
