import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import SettingsContent from './settings-content'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'room-types' } = await searchParams
  const supabase = await createClient()

  const [
    { data: roomTypesRaw },
    { data: roomsRaw },
    { data: doctors },
    { data: staff },
    { data: discounts },
    { data: cleaningTypes },
  ] = await Promise.all([
    supabase.from('room_types').select('*').order('name'),
    supabase.from('rooms').select('*, room_types(name)').order('name'),
    supabase.from('doctors').select('*').order('name'),
    supabase.from('staff').select('*').order('name'),
    supabase.from('discounts').select('*').order('percent'),
    supabase.from('cleaning_types').select('*').order('name'),
  ])

  // Compute room count per type from the already-fetched rooms data
  const roomCountByType: Record<string, number> = {}
  for (const room of roomsRaw ?? []) {
    roomCountByType[room.room_type_id] = (roomCountByType[room.room_type_id] ?? 0) + 1
  }
  const roomTypes = (roomTypesRaw ?? []).map(rt => ({
    ...rt,
    room_count: roomCountByType[rt.id] ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-xs mb-2 inline-block" style={{ color: 'var(--text-light)' }}>
          ← Admin
        </Link>
        <h1 style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '2rem', fontWeight: 400, color: 'var(--primary)' }}>
          ตั้งค่าระบบ
        </h1>
      </div>

      <SettingsContent
        tab={tab}
        roomTypes={roomTypes}
        rooms={roomsRaw ?? []}
        doctors={doctors ?? []}
        staff={staff ?? []}
        discounts={discounts ?? []}
        cleaningTypes={cleaningTypes ?? []}
      />
    </div>
  )
}
