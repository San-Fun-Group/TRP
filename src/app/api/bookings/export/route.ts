import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_ROLES = new Set(['super_admin', 'admin'])

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function row(cells: unknown[]): string {
  return cells.map(escapeCsv).join(',')
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = user.app_metadata?.role as string | undefined
  if (!ADMIN_ROLES.has(role ?? '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const status    = sp.get('status')
  const q         = sp.get('q')
  const checkin   = sp.get('checkin')
  const checkout  = sp.get('checkout')
  const payment   = sp.get('payment')
  const room_type = sp.get('room_type')
  const from      = sp.get('from')
  const to        = sp.get('to')

  let query = supabase
    .from('bookings')
    .select(`
      id, guest_name, email, guest_count,
      checkin_date, checkout_date, nights,
      extra_beds, needs_caretaker,
      room_price_at_booking, extra_bed_price_at_booking, discount_percent_at_booking, total_price,
      status, payment_status,
      created_at,
      room_types(name), rooms(name), staff(name), doctors(name), discounts(label)
    `)
    .order('checkin_date', { ascending: false })
    .limit(5000)

  if (status && status !== 'all') query = query.eq('status', status)
  if (q)          query = query.ilike('guest_name', `%${q}%`)
  if (checkin)    query = query.eq('checkin_date', checkin)
  if (checkout)   query = query.eq('checkout_date', checkout)
  if (payment)    query = query.eq('payment_status', payment)
  if (room_type)  query = query.eq('room_type_id', room_type)
  if (from)       query = query.gte('checkin_date', from)
  if (to)         query = query.lte('checkin_date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const HEADERS = [
    'ID', 'ชื่อผู้เข้าพัก', 'อีเมล', 'จำนวนผู้เข้าพัก',
    'วันเช็คอิน', 'วันเช็คเอาท์', 'จำนวนคืน',
    'ประเภทห้อง', 'ห้องพัก', 'แพทย์', 'เจ้าหน้าที่',
    'เตียงเสริม', 'ผู้ดูแล',
    'ราคาห้อง/คืน', 'ราคาเตียงเสริม', 'ส่วนลด (%)', 'ราคารวม',
    'สถานะ', 'สถานะชำระเงิน',
    'วันที่สร้าง',
  ]

  const lines = [HEADERS.join(',')]

  for (const b of data ?? []) {
    const rt = (b.room_types as unknown as { name: string } | null)?.name ?? ''
    const rm = (b.rooms     as unknown as { name: string } | null)?.name ?? ''
    const dr = (b.doctors   as unknown as { name: string } | null)?.name ?? ''
    const st = (b.staff     as unknown as { name: string } | null)?.name ?? ''

    lines.push(row([
      b.id.slice(0, 8).toUpperCase(),
      b.guest_name,
      b.email ?? '',
      b.guest_count,
      b.checkin_date,
      b.checkout_date,
      b.nights,
      rt, rm, dr, st,
      b.extra_beds,
      b.needs_caretaker ? 'ใช่' : 'ไม่',
      b.room_price_at_booking,
      b.extra_bed_price_at_booking,
      b.discount_percent_at_booking,
      b.total_price,
      b.status,
      b.payment_status,
      new Date(b.created_at).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' }),
    ]))
  }

  const csv = '﻿' + lines.join('\r\n') // BOM for Thai characters in Excel

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bookings-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
