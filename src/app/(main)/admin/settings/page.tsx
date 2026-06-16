import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  upsertRoomType, toggleRoomTypeActive,
  upsertRoom,     toggleRoomActive,
  upsertDoctor,   toggleDoctorActive,
  upsertStaff,    toggleStaffActive,
  upsertDiscount, toggleDiscountActive,
  upsertCleaningType, deleteCleaningType,
} from '@/lib/actions/settings'

const TABS = [
  { value: 'room-types', label: 'ประเภทห้อง' },
  { value: 'rooms',      label: 'ห้องพัก' },
  { value: 'doctors',    label: 'แพทย์' },
  { value: 'staff',      label: 'เจ้าหน้าที่' },
  { value: 'discounts',  label: 'ส่วนลด' },
  { value: 'cleaning',   label: 'ประเภทการทำความสะอาด' },
]

const STAFF_ROLE_LABEL: Record<string, string> = {
  super_admin:  'Super Admin',
  admin:        'Admin',
  reception:    'Reception',
  agent:        'Agent',
  housekeeping: 'Housekeeping',
}


export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; edit?: string }>
}) {
  const { tab = 'room-types', edit } = await searchParams
  const supabase = await createClient()

  const [
    { data: roomTypes },
    { data: rooms },
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

  const tabHref = (v: string) => `/admin/settings?tab=${v}`
  const editHref = (id: string) => `/admin/settings?tab=${tab}&edit=${id}`
  const cancelEditHref = `/admin/settings?tab=${tab}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin" className="text-xs mb-2 inline-block" style={{ color: 'var(--text-light)' }}>
          ← Reception
        </Link>
        <h1 style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '2rem', fontWeight: 400, color: 'var(--primary)' }}>
          ตั้งค่าระบบ
        </h1>
      </div>

      {/* Layout: sidebar + content */}
      <div className="flex flex-col md:flex-row gap-6 items-start">

        {/* Side menu */}
        <aside className="w-full md:w-44 shrink-0">
          <nav className="card p-1.5 flex md:flex-col flex-row gap-0.5 overflow-x-auto">
            {TABS.map(t => {
              const isActive = tab === t.value
              return (
                <Link key={t.value} href={tabHref(t.value)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm rounded transition-colors whitespace-nowrap"
                  style={{
                    backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                    color:           isActive ? '#fff' : 'var(--text-muted)',
                    fontWeight:      isActive ? 500 : 400,
                  }}>
                  {t.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">

      {/* ── Room Types ── */}
      {tab === 'room-types' && (
        <section className="space-y-4">
          {/* Add form */}
          <div className="card p-5">
            <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: 'var(--text-light)' }}>
              เพิ่มประเภทห้องใหม่
            </p>
            <form action={upsertRoomType} className="flex flex-wrap gap-3 items-end">
              <Field label="ชื่อประเภท">
                <TextInput name="name" placeholder="เช่น Deluxe" />
              </Field>
              <Field label="ราคา/คืน (฿)">
                <NumInput name="price_per_night" />
              </Field>
              <Field label="ราคาเตียงเสริม (฿)">
                <NumInput name="extra_bed_price" />
              </Field>
              <SaveBtn label="เพิ่ม" />
            </form>
          </div>

          {/* List */}
          <div className="card overflow-x-auto px-5 pt-2 pb-1">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['ชื่อประเภท', 'ราคา/คืน', 'ราคาเตียงเสริม', 'สถานะ', ''].map(h => (
                    <TH key={h}>{h}</TH>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roomTypes?.map(rt => edit === rt.id ? (
                  <tr key={rt.id} style={{ borderBottom: '1px solid var(--border-soft)', backgroundColor: 'var(--surface)' }}>
                    <td colSpan={5} className="py-3 px-2">
                      <form action={upsertRoomType} className="flex flex-wrap gap-3 items-end">
                        <input type="hidden" name="id" value={rt.id} />
                        <Field label="ชื่อประเภท">
                          <TextInput name="name" defaultValue={rt.name} />
                        </Field>
                        <Field label="ราคา/คืน">
                          <NumInput name="price_per_night" defaultValue={rt.price_per_night} />
                        </Field>
                        <Field label="ราคาเตียงเสริม">
                          <NumInput name="extra_bed_price" defaultValue={rt.extra_bed_price} />
                        </Field>
                        <SaveBtn label="บันทึก" />
                        <CancelBtn href={cancelEditHref} />
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={rt.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                    <TD>{rt.name}</TD>
                    <TD>{rt.price_per_night.toLocaleString()} ฿</TD>
                    <TD>{rt.extra_bed_price.toLocaleString()} ฿</TD>
                    <td className="py-3 pr-4">
                      <ActiveBadge active={rt.is_active} />
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Link href={editHref(rt.id)} className="text-xs px-2 py-1 rounded"
                          style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                          แก้ไข
                        </Link>
                        <form action={toggleRoomTypeActive.bind(null, rt.id, !rt.is_active)}>
                          <ToggleBtn active={rt.is_active} />
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Rooms ── */}
      {tab === 'rooms' && (
        <section className="space-y-4">
          <div className="card p-5">
            <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: 'var(--text-light)' }}>
              เพิ่มห้องพักใหม่
            </p>
            <form action={upsertRoom} className="flex flex-wrap gap-3 items-end">
              <Field label="ชื่อห้อง">
                <TextInput name="name" placeholder="เช่น 101" />
              </Field>
              <Field label="ประเภทห้อง">
                <RoomTypeSelect roomTypes={roomTypes ?? []} />
              </Field>
              <SaveBtn label="เพิ่ม" />
            </form>
          </div>

          <div className="card overflow-x-auto px-5 pt-2 pb-1">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['ชื่อห้อง', 'ประเภทห้อง', 'สถานะ', ''].map(h => <TH key={h}>{h}</TH>)}
                </tr>
              </thead>
              <tbody>
                {rooms?.map(r => {
                  const typeName = (r.room_types as unknown as { name: string } | null)?.name ?? '—'
                  return edit === r.id ? (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-soft)', backgroundColor: 'var(--surface)' }}>
                      <td colSpan={4} className="py-3 px-2">
                        <form action={upsertRoom} className="flex flex-wrap gap-3 items-end">
                          <input type="hidden" name="id" value={r.id} />
                          <Field label="ชื่อห้อง">
                            <TextInput name="name" defaultValue={r.name} />
                          </Field>
                          <Field label="ประเภทห้อง">
                            <RoomTypeSelect roomTypes={roomTypes ?? []} defaultValue={r.room_type_id} />
                          </Field>
                          <SaveBtn label="บันทึก" />
                          <CancelBtn href={cancelEditHref} />
                        </form>
                      </td>
                    </tr>
                  ) : (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      <TD>{r.name}</TD>
                      <TD>{typeName}</TD>
                      <td className="py-3 pr-4"><ActiveBadge active={r.is_active} /></td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Link href={editHref(r.id)} className="text-xs px-2 py-1 rounded"
                            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                            แก้ไข
                          </Link>
                          <form action={toggleRoomActive.bind(null, r.id, !r.is_active)}>
                            <ToggleBtn active={r.is_active} />
                          </form>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Doctors ── */}
      {tab === 'doctors' && (
        <section className="space-y-4">
          <div className="card p-5">
            <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: 'var(--text-light)' }}>
              เพิ่มแพทย์ใหม่
            </p>
            <form action={upsertDoctor} className="flex flex-wrap gap-3 items-end">
              <Field label="ชื่อแพทย์">
                <TextInput name="name" placeholder="นพ. / พญ. ..." />
              </Field>
              <SaveBtn label="เพิ่ม" />
            </form>
          </div>

          <div className="card overflow-x-auto px-5 pt-2 pb-1">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['ชื่อแพทย์', 'สถานะ', ''].map(h => <TH key={h}>{h}</TH>)}
                </tr>
              </thead>
              <tbody>
                {doctors?.map(d => edit === d.id ? (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border-soft)', backgroundColor: 'var(--surface)' }}>
                    <td colSpan={3} className="py-3 px-2">
                      <form action={upsertDoctor} className="flex flex-wrap gap-3 items-end">
                        <input type="hidden" name="id" value={d.id} />
                        <Field label="ชื่อแพทย์">
                          <TextInput name="name" defaultValue={d.name} />
                        </Field>
                        <SaveBtn label="บันทึก" />
                        <CancelBtn href={cancelEditHref} />
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                    <TD>{d.name}</TD>
                    <td className="py-3 pr-4"><ActiveBadge active={d.is_active} /></td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Link href={editHref(d.id)} className="text-xs px-2 py-1 rounded"
                          style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                          แก้ไข
                        </Link>
                        <form action={toggleDoctorActive.bind(null, d.id, !d.is_active)}>
                          <ToggleBtn active={d.is_active} />
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Staff ── */}
      {tab === 'staff' && (
        <section className="space-y-4">
          <div className="card p-5">
            <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: 'var(--text-light)' }}>
              เพิ่มเจ้าหน้าที่ใหม่
            </p>
            <form action={upsertStaff} className="flex flex-wrap gap-3 items-end">
              <Field label="ชื่อ">
                <TextInput name="name" placeholder="ชื่อ-นามสกุล" />
              </Field>
              <Field label="สิทธิ์">
                <StaffRoleSelect />
              </Field>
              <SaveBtn label="เพิ่ม" />
            </form>
          </div>

          <div className="card overflow-x-auto px-5 pt-2 pb-1">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['ชื่อ', 'สิทธิ์', 'สถานะ', ''].map(h => <TH key={h}>{h}</TH>)}
                </tr>
              </thead>
              <tbody>
                {staff?.map(s => edit === s.id ? (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-soft)', backgroundColor: 'var(--surface)' }}>
                    <td colSpan={4} className="py-3 px-2">
                      <form action={upsertStaff} className="flex flex-wrap gap-3 items-end">
                        <input type="hidden" name="id" value={s.id} />
                        <Field label="ชื่อ">
                          <TextInput name="name" defaultValue={s.name} />
                        </Field>
                        <Field label="สิทธิ์">
                          <StaffRoleSelect defaultValue={s.role} />
                        </Field>
                        <SaveBtn label="บันทึก" />
                        <CancelBtn href={cancelEditHref} />
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                    <TD>{s.name}</TD>
                    <TD>{STAFF_ROLE_LABEL[s.role] ?? s.role}</TD>
                    <td className="py-3 pr-4"><ActiveBadge active={s.is_active} /></td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Link href={editHref(s.id)} className="text-xs px-2 py-1 rounded"
                          style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                          แก้ไข
                        </Link>
                        <form action={toggleStaffActive.bind(null, s.id, !s.is_active)}>
                          <ToggleBtn active={s.is_active} />
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Discounts ── */}
      {tab === 'discounts' && (
        <section className="space-y-4">
          <div className="card p-5">
            <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: 'var(--text-light)' }}>
              เพิ่มส่วนลดใหม่
            </p>
            <form action={upsertDiscount} className="flex flex-wrap gap-3 items-end">
              <Field label="ชื่อส่วนลด">
                <TextInput name="label" placeholder="เช่น สิทธิ์พนักงาน" />
              </Field>
              <Field label="เปอร์เซ็นต์">
                <DiscountPercentSelect />
              </Field>
              <SaveBtn label="เพิ่ม" />
            </form>
          </div>

          <div className="card overflow-x-auto px-5 pt-2 pb-1">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['ชื่อส่วนลด', 'เปอร์เซ็นต์', 'สถานะ', ''].map(h => <TH key={h}>{h}</TH>)}
                </tr>
              </thead>
              <tbody>
                {discounts?.map(d => edit === d.id ? (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border-soft)', backgroundColor: 'var(--surface)' }}>
                    <td colSpan={4} className="py-3 px-2">
                      <form action={upsertDiscount} className="flex flex-wrap gap-3 items-end">
                        <input type="hidden" name="id" value={d.id} />
                        <Field label="ชื่อส่วนลด">
                          <TextInput name="label" defaultValue={d.label} />
                        </Field>
                        <Field label="เปอร์เซ็นต์">
                          <DiscountPercentSelect defaultValue={d.percent} />
                        </Field>
                        <SaveBtn label="บันทึก" />
                        <CancelBtn href={cancelEditHref} />
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                    <TD>{d.label}</TD>
                    <TD>{d.percent}%</TD>
                    <td className="py-3 pr-4"><ActiveBadge active={d.is_active} /></td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Link href={editHref(d.id)} className="text-xs px-2 py-1 rounded"
                          style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                          แก้ไข
                        </Link>
                        <form action={toggleDiscountActive.bind(null, d.id, !d.is_active)}>
                          <ToggleBtn active={d.is_active} />
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Cleaning Types ── */}
      {tab === 'cleaning' && (
        <section className="space-y-4">
          <div className="card p-5">
            <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: 'var(--text-light)' }}>
              เพิ่มประเภทการทำความสะอาดใหม่
            </p>
            <form action={upsertCleaningType} className="flex flex-wrap gap-3 items-end">
              <Field label="ชื่อประเภท">
                <TextInput name="name" placeholder="เช่น ทำความสะอาดทั่วไป" />
              </Field>
              <SaveBtn label="เพิ่ม" />
            </form>
          </div>

          <div className="card overflow-x-auto px-5 pt-2 pb-1">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['ชื่อประเภท', ''].map(h => <TH key={h}>{h}</TH>)}
                </tr>
              </thead>
              <tbody>
                {cleaningTypes?.map(ct => edit === ct.id ? (
                  <tr key={ct.id} style={{ borderBottom: '1px solid var(--border-soft)', backgroundColor: 'var(--surface)' }}>
                    <td colSpan={2} className="py-3 px-2">
                      <form action={upsertCleaningType} className="flex flex-wrap gap-3 items-end">
                        <input type="hidden" name="id" value={ct.id} />
                        <Field label="ชื่อประเภท">
                          <TextInput name="name" defaultValue={ct.name} />
                        </Field>
                        <SaveBtn label="บันทึก" />
                        <CancelBtn href={cancelEditHref} />
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={ct.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                    <TD>{ct.name}</TD>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Link href={editHref(ct.id)} className="text-xs px-2 py-1 rounded"
                          style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                          แก้ไข
                        </Link>
                        <form action={deleteCleaningType.bind(null, ct.id)}>
                          <button type="submit" className="text-xs px-2 py-1 rounded"
                            style={{ backgroundColor: '#C0392B18', color: '#C0392B' }}>
                            ลบ
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

        </div>{/* end content */}
      </div>{/* end flex layout */}
    </div>
  )
}

// ── Small shared components ───────────────────────────────────

function TH({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left pb-2 pr-4 font-medium text-xs tracking-wide" style={{ color: 'var(--text-light)' }}>
      {children}
    </th>
  )
}

function TD({ children }: { children: React.ReactNode }) {
  return <td className="py-3 pr-4 text-sm" style={{ color: 'var(--text)' }}>{children}</td>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs mb-1 block" style={{ color: 'var(--text-light)' }}>{label}</span>
      {children}
    </label>
  )
}

function TextInput({ name, placeholder, defaultValue }: { name: string; placeholder?: string; defaultValue?: string }) {
  return (
    <input name={name} defaultValue={defaultValue} placeholder={placeholder}
      className="text-sm px-3 py-2 rounded"
      style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)', minWidth: '160px' }}
    />
  )
}

function NumInput({ name, defaultValue }: { name: string; defaultValue?: number }) {
  return (
    <input name={name} type="number" min={0} defaultValue={defaultValue ?? 0}
      className="text-sm px-3 py-2 rounded"
      style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)', width: '120px' }}
    />
  )
}

function RoomTypeSelect({ roomTypes, defaultValue }: { roomTypes: { id: string; name: string }[]; defaultValue?: string }) {
  return (
    <select name="room_type_id" defaultValue={defaultValue}
      className="text-sm px-3 py-2 rounded"
      style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <option value="">— เลือกประเภท —</option>
      {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
    </select>
  )
}

function StaffRoleSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <select name="role" defaultValue={defaultValue}
      className="text-sm px-3 py-2 rounded"
      style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <option value="">— เลือกสิทธิ์ —</option>
      <option value="admin">Admin</option>
      <option value="reception">Reception</option>
      <option value="agent">Agent</option>
      <option value="housekeeping">Housekeeping</option>
      <option value="super_admin">Super Admin</option>
    </select>
  )
}

function DiscountPercentSelect({ defaultValue }: { defaultValue?: number }) {
  return (
    <select name="percent" defaultValue={defaultValue}
      className="text-sm px-3 py-2 rounded"
      style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {[0, 5, 10, 20, 100].map(p => <option key={p} value={p}>{p}%</option>)}
    </select>
  )
}

function SaveBtn({ label }: { label: string }) {
  return (
    <button type="submit" className="text-xs px-4 py-2 rounded font-medium self-end"
      style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
      {label}
    </button>
  )
}

function CancelBtn({ href }: { href: string }) {
  return (
    <Link href={href} className="text-xs px-4 py-2 rounded font-medium self-end"
      style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
      ยกเลิก
    </Link>
  )
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full"
      style={{ backgroundColor: active ? '#2E7D5E18' : '#AAA3', color: active ? '#2E7D5E' : '#AAA' }}>
      {active ? 'ใช้งาน' : 'ปิดใช้งาน'}
    </span>
  )
}

function ToggleBtn({ active }: { active: boolean }) {
  return (
    <button type="submit" className="text-xs px-2 py-1 rounded"
      style={{ backgroundColor: active ? '#AAA18' : '#2E7D5E18', color: active ? '#888' : '#2E7D5E' }}>
      {active ? 'ปิด' : 'เปิด'}
    </button>
  )
}
