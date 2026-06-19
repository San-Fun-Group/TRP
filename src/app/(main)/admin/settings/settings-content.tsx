'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  upsertRoomType, toggleRoomTypeActive,
  upsertRoom,     toggleRoomActive,
  upsertDoctor,   toggleDoctorActive,
  upsertStaff,    toggleStaffActive,
  upsertDiscount, toggleDiscountActive,
  upsertCleaningType, deleteCleaningType,
  assignRoomToType,
} from '@/lib/actions/settings'

// ── Types ──────────────────────────────────────────────────────────────────────

export type RoomType = {
  id: string; name: string; price_per_night: number
  extra_bed_price: number; is_active: boolean; room_count: number
}
export type Room = {
  id: string; name: string; room_type_id: string
  is_active: boolean; room_types?: { name: string } | null
}
export type Doctor       = { id: string; name: string; is_active: boolean }
export type StaffMember  = { id: string; name: string; role: string; is_active: boolean }
export type Discount     = { id: string; label: string; percent: number; is_active: boolean }
export type CleaningType = { id: string; name: string }

type ModalState =
  | { section: 'room-types';      item?: RoomType }
  | { section: 'room-type-rooms'; roomType: RoomType }
  | { section: 'rooms';           item?: Room }
  | { section: 'doctors';         item?: Doctor }
  | { section: 'staff';           item?: StaffMember }
  | { section: 'discounts';       item?: Discount }
  | { section: 'cleaning';        item?: CleaningType }
  | null

export interface SettingsContentProps {
  tab: string
  roomTypes: RoomType[]
  rooms: Room[]
  doctors: Doctor[]
  staff: StaffMember[]
  discounts: Discount[]
  cleaningTypes: CleaningType[]
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TABS = [
  { value: 'room-types', label: 'ประเภทห้อง' },
  { value: 'rooms',      label: 'ห้องพัก' },
  { value: 'doctors',    label: 'แพทย์' },
  { value: 'staff',      label: 'เจ้าหน้าที่' },
  { value: 'discounts',  label: 'ส่วนลด' },
  { value: 'cleaning',   label: 'การทำความสะอาด' },
]

const SECTION_LABEL: Record<string, string> = {
  'room-types': 'ประเภทห้อง',
  'rooms':      'ห้องพัก',
  'doctors':    'แพทย์',
  'staff':      'เจ้าหน้าที่',
  'discounts':  'ส่วนลด',
  'cleaning':   'ประเภทการทำความสะอาด',
}

const STAFF_ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin', admin: 'Admin', reception: 'Reception',
  agent: 'Agent', housekeeping: 'Housekeeping',
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SettingsContent({
  tab, roomTypes, rooms, doctors, staff, discounts, cleaningTypes,
}: SettingsContentProps) {
  const [modal, setModal] = useState<ModalState>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const [tabOpen, setTabOpen] = useState(false)
  const tabDropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!tabOpen) return
    function onDown(e: MouseEvent) {
      if (tabDropRef.current && !tabDropRef.current.contains(e.target as Node)) {
        setTabOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [tabOpen])

  function open(state: NonNullable<ModalState>) {
    setModalError(null)
    setModal(state)
  }

  function close() {
    setModal(null)
    setModalError(null)
  }

  function handleSubmit(action: (fd: FormData) => Promise<{ error?: string }>) {
    return (e: React.SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault()
      setModalError(null)
      const fd = new FormData(e.currentTarget)
      startTransition(async () => {
        const result = await action(fd)
        if (result?.error) {
          setModalError(result.error)
          return
        }
        router.refresh()
        setModal(null)
      })
    }
  }

  const modalTitle = !modal
    ? ''
    : modal.section === 'room-type-rooms'
      ? `ห้องพักใน ${modal.roomType.name}`
      : `${modal.item ? 'แก้ไข' : 'เพิ่ม'} ${SECTION_LABEL[modal.section]}`

  return (
    <>
      {/* Mobile: custom tab dropdown */}
      <div className="md:hidden mb-4 relative" ref={tabDropRef}>
        <button
          type="button"
          onClick={() => setTabOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm rounded-xl"
          style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
          <span style={{ fontWeight: 500, color: 'var(--primary)' }}>
            {TABS.find(t => t.value === tab)?.label ?? tab}
          </span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
            style={{ color: 'var(--text-muted)', transform: tabOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {tabOpen && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl overflow-hidden"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
            {TABS.map(t => {
              const active = tab === t.value
              return (
                <button key={t.value} type="button"
                  onClick={() => { router.push(`/admin/settings?tab=${t.value}`); setTabOpen(false) }}
                  className="w-full text-left px-4 py-3 text-sm transition-colors"
                  style={{
                    backgroundColor: active ? 'rgba(82,58,133,0.09)' : 'transparent',
                    color: active ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: active ? 500 : 400,
                  }}>
                  {t.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex md:flex-row gap-6 items-start">

        {/* ── Sidebar (desktop only) ── */}
        <aside className="hidden md:block w-44 shrink-0">
          <nav className="card p-1.5 flex flex-col gap-0.5">
            {TABS.map(t => {
              const active = tab === t.value
              return (
                <Link
                  key={t.value}
                  href={`/admin/settings?tab=${t.value}`}
                  className="flex items-center px-3 py-2 text-sm rounded whitespace-nowrap transition-colors"
                  style={active ? {
                    backgroundColor: 'rgba(82,58,133,0.09)',
                    color: 'var(--primary)',
                    fontWeight: 500,
                    borderRadius: '7px',
                  } : {
                    color: 'var(--text-muted)',
                    borderRadius: '7px',
                  }}
                >
                  {t.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* ── Content ── */}
        <div className="flex-1 min-w-0 space-y-3">

          {tab === 'room-types' && <>
            <SectionRow title="ประเภทห้อง" label="+ เพิ่มประเภทห้อง" onAdd={() => open({ section: 'room-types' })} />
            <TableCard>
              <THead cols={['ชื่อประเภท', 'ห้องพัก', 'ราคา/คืน', 'เตียงเสริม', 'สถานะ', '']} />
              <tbody>
                {roomTypes.map(rt => (
                  <Row key={rt.id}>
                    <NameCell>{rt.name}</NameCell>
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => open({ section: 'room-type-rooms', roomType: rt })}
                        className="transition-opacity hover:opacity-70"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        <Pill color="purple">{rt.room_count} ห้อง</Pill>
                      </button>
                    </td>
                    <DataCell>฿{rt.price_per_night.toLocaleString()}</DataCell>
                    <DataCell>฿{rt.extra_bed_price.toLocaleString()}</DataCell>
                    <td className="py-3 pr-4"><StatusBadge active={rt.is_active} /></td>
                    <ActionCell
                      onEdit={() => open({ section: 'room-types', item: rt })}
                      toggleEl={<form action={toggleRoomTypeActive.bind(null, rt.id, !rt.is_active)}><ToggleBtn active={rt.is_active} /></form>}
                    />
                  </Row>
                ))}
                {!roomTypes.length && <EmptyRow cols={6} />}
              </tbody>
            </TableCard>
          </>}

          {tab === 'rooms' && <>
            <SectionRow title="ห้องพัก" label="+ เพิ่มห้องพัก" onAdd={() => open({ section: 'rooms' })} />
            <TableCard>
              <THead cols={['ชื่อห้อง', 'ประเภทห้อง', 'สถานะ', '']} />
              <tbody>
                {rooms.map(r => {
                  const typeName = (r.room_types as { name: string } | null)?.name ?? '—'
                  return (
                    <Row key={r.id}>
                      <NameCell>{r.name}</NameCell>
                      <DataCell>{typeName}</DataCell>
                      <td className="py-3 pr-4"><StatusBadge active={r.is_active} /></td>
                      <ActionCell
                        onEdit={() => open({ section: 'rooms', item: r })}
                        toggleEl={<form action={toggleRoomActive.bind(null, r.id, !r.is_active)}><ToggleBtn active={r.is_active} /></form>}
                      />
                    </Row>
                  )
                })}
                {!rooms.length && <EmptyRow cols={4} />}
              </tbody>
            </TableCard>
          </>}

          {tab === 'doctors' && <>
            <SectionRow title="แพทย์" label="+ เพิ่มแพทย์" onAdd={() => open({ section: 'doctors' })} />
            <TableCard>
              <THead cols={['ชื่อแพทย์', 'สถานะ', '']} />
              <tbody>
                {doctors.map(d => (
                  <Row key={d.id}>
                    <NameCell>{d.name}</NameCell>
                    <td className="py-3 pr-4"><StatusBadge active={d.is_active} /></td>
                    <ActionCell
                      onEdit={() => open({ section: 'doctors', item: d })}
                      toggleEl={<form action={toggleDoctorActive.bind(null, d.id, !d.is_active)}><ToggleBtn active={d.is_active} /></form>}
                    />
                  </Row>
                ))}
                {!doctors.length && <EmptyRow cols={3} />}
              </tbody>
            </TableCard>
          </>}

          {tab === 'staff' && <>
            <SectionRow title="เจ้าหน้าที่" label="+ เพิ่มเจ้าหน้าที่" onAdd={() => open({ section: 'staff' })} />
            <TableCard>
              <THead cols={['ชื่อ', 'สิทธิ์', 'สถานะ', '']} />
              <tbody>
                {staff.map(s => (
                  <Row key={s.id}>
                    <NameCell>{s.name}</NameCell>
                    <DataCell>{STAFF_ROLE_LABEL[s.role] ?? s.role}</DataCell>
                    <td className="py-3 pr-4"><StatusBadge active={s.is_active} /></td>
                    <ActionCell
                      onEdit={() => open({ section: 'staff', item: s })}
                      toggleEl={<form action={toggleStaffActive.bind(null, s.id, !s.is_active)}><ToggleBtn active={s.is_active} /></form>}
                    />
                  </Row>
                ))}
                {!staff.length && <EmptyRow cols={4} />}
              </tbody>
            </TableCard>
          </>}

          {tab === 'discounts' && <>
            <SectionRow title="ส่วนลด" label="+ เพิ่มส่วนลด" onAdd={() => open({ section: 'discounts' })} />
            <TableCard>
              <THead cols={['ชื่อส่วนลด', 'เปอร์เซ็นต์', 'สถานะ', '']} />
              <tbody>
                {discounts.map(d => (
                  <Row key={d.id}>
                    <NameCell>{d.label}</NameCell>
                    <td className="py-3 pr-4"><Pill color="gold">{d.percent}%</Pill></td>
                    <td className="py-3 pr-4"><StatusBadge active={d.is_active} /></td>
                    <ActionCell
                      onEdit={() => open({ section: 'discounts', item: d })}
                      toggleEl={<form action={toggleDiscountActive.bind(null, d.id, !d.is_active)}><ToggleBtn active={d.is_active} /></form>}
                    />
                  </Row>
                ))}
                {!discounts.length && <EmptyRow cols={4} />}
              </tbody>
            </TableCard>
          </>}

          {tab === 'cleaning' && <>
            <SectionRow title="ประเภทการทำความสะอาด" label="+ เพิ่มประเภท" onAdd={() => open({ section: 'cleaning' })} />
            <TableCard>
              <THead cols={['ชื่อประเภท', '']} />
              <tbody>
                {cleaningTypes.map(ct => (
                  <Row key={ct.id}>
                    <NameCell>{ct.name}</NameCell>
                    <td className="py-3 pr-5">
                      <div className="flex gap-1.5 justify-end">
                        <GhostBtn onClick={() => open({ section: 'cleaning', item: ct })}>แก้ไข</GhostBtn>
                        <form action={deleteCleaningType.bind(null, ct.id)}>
                          <GhostBtn submit danger>ลบ</GhostBtn>
                        </form>
                      </div>
                    </td>
                  </Row>
                ))}
                {!cleaningTypes.length && <EmptyRow cols={2} />}
              </tbody>
            </TableCard>
          </>}

        </div>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            onClick={close}
            style={{ backgroundColor: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(4px)' }}
          />
          <div
            className="relative card w-full max-w-md"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.14), 0 0 0 1px rgba(82,58,133,0.07)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border-soft)' }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {modalTitle}
              </span>
              <button
                onClick={close}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-light)', fontSize: '20px', lineHeight: 1,
                  display: 'flex', alignItems: 'center', padding: '2px 4px',
                  borderRadius: '4px',
                }}
              >
                ×
              </button>
            </div>

            {/* Form */}
            <div className="p-5">

              {modal.section === 'room-type-rooms' && (() => {
                const myRooms    = rooms.filter(r => r.room_type_id === modal.roomType.id)
                const otherRooms = rooms.filter(r => r.room_type_id !== modal.roomType.id)
                return (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold mb-2 tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>
                        ห้องพักในประเภทนี้
                      </p>
                      {myRooms.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {myRooms.map(r => (
                            <span key={r.id} className="text-sm px-3 py-1.5 rounded-lg"
                              style={{ backgroundColor: 'rgba(82,58,133,0.07)', color: 'var(--primary)', fontWeight: 500 }}>
                              {r.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm" style={{ color: 'var(--text-light)' }}>ยังไม่มีห้องพักในประเภทนี้</p>
                      )}
                    </div>

                    {otherRooms.length > 0 ? (
                      <>
                        <div style={{ borderTop: '1px solid var(--border-soft)' }} />
                        <form onSubmit={handleSubmit(assignRoomToType)} className="space-y-3">
                          <input type="hidden" name="room_type_id" value={modal.roomType.id} />
                          <MField label="ย้ายห้องพักเข้าประเภทนี้">
                            <MSelect name="room_id" defaultValue="">
                              <option value="">— เลือกห้อง —</option>
                              {otherRooms.map(r => {
                                const currentType = (r.room_types as { name: string } | null)?.name ?? '—'
                                return <option key={r.id} value={r.id}>{r.name} (จาก: {currentType})</option>
                              })}
                            </MSelect>
                          </MField>
                          <MActions pending={pending} onCancel={close} label="ย้ายเข้าประเภทนี้" error={modalError} />
                        </form>
                      </>
                    ) : (
                      <div className="flex justify-end">
                        <button type="button" onClick={close} style={{
                          background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
                          borderRadius: '8px', padding: '9px 16px', fontSize: '13px', cursor: 'pointer', fontWeight: 500,
                        }}>ปิด</button>
                      </div>
                    )}
                  </div>
                )
              })()}

              {modal.section === 'room-types' && (
                <form key={modal.item?.id ?? 'new'} onSubmit={handleSubmit(upsertRoomType)} className="space-y-4">
                  {modal.item && <input type="hidden" name="id" value={modal.item.id} />}
                  <MField label="ชื่อประเภทห้อง">
                    <MText name="name" defaultValue={modal.item?.name} placeholder="เช่น Deluxe, Standard, Suite" />
                  </MField>
                  <div className="grid grid-cols-2 gap-3">
                    <MField label="ราคา/คืน (฿)">
                      <MNum name="price_per_night" defaultValue={modal.item?.price_per_night ?? 0} />
                    </MField>
                    <MField label="ราคาเตียงเสริม (฿)">
                      <MNum name="extra_bed_price" defaultValue={modal.item?.extra_bed_price ?? 0} />
                    </MField>
                  </div>
                  <MActions pending={pending} onCancel={close} label={modal.item ? 'บันทึก' : 'เพิ่มประเภทห้อง'} error={modalError} />
                </form>
              )}

              {modal.section === 'rooms' && (
                <form key={modal.item?.id ?? 'new'} onSubmit={handleSubmit(upsertRoom)} className="space-y-4">
                  {modal.item && <input type="hidden" name="id" value={modal.item.id} />}
                  <MField label="ชื่อห้อง">
                    <MText name="name" defaultValue={modal.item?.name} placeholder="เช่น 101, 201A" />
                  </MField>
                  <MField label="ประเภทห้อง">
                    <MSelect name="room_type_id" defaultValue={modal.item?.room_type_id}>
                      <option value="">— เลือกประเภท —</option>
                      {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                    </MSelect>
                  </MField>
                  <MActions pending={pending} onCancel={close} label={modal.item ? 'บันทึก' : 'เพิ่มห้องพัก'} error={modalError} />
                </form>
              )}

              {modal.section === 'doctors' && (
                <form key={modal.item?.id ?? 'new'} onSubmit={handleSubmit(upsertDoctor)} className="space-y-4">
                  {modal.item && <input type="hidden" name="id" value={modal.item.id} />}
                  <MField label="ชื่อแพทย์">
                    <MText name="name" defaultValue={modal.item?.name} placeholder="นพ. / พญ. ..." />
                  </MField>
                  <MActions pending={pending} onCancel={close} label={modal.item ? 'บันทึก' : 'เพิ่มแพทย์'} error={modalError} />
                </form>
              )}

              {modal.section === 'staff' && (
                <form key={modal.item?.id ?? 'new'} onSubmit={handleSubmit(upsertStaff)} className="space-y-4">
                  {modal.item && <input type="hidden" name="id" value={modal.item.id} />}
                  <MField label="ชื่อ-นามสกุล">
                    <MText name="name" defaultValue={modal.item?.name} placeholder="ชื่อ-นามสกุล" />
                  </MField>
                  <MField label="สิทธิ์การใช้งาน">
                    <MSelect name="role" defaultValue={modal.item?.role}>
                      <option value="">— เลือกสิทธิ์ —</option>
                      <option value="admin">Admin</option>
                      <option value="reception">Reception</option>
                      <option value="agent">Agent</option>
                      <option value="housekeeping">Housekeeping</option>
                      <option value="super_admin">Super Admin</option>
                    </MSelect>
                  </MField>
                  <MActions pending={pending} onCancel={close} label={modal.item ? 'บันทึก' : 'เพิ่มเจ้าหน้าที่'} error={modalError} />
                </form>
              )}

              {modal.section === 'discounts' && (
                <form key={modal.item?.id ?? 'new'} onSubmit={handleSubmit(upsertDiscount)} className="space-y-4">
                  {modal.item && <input type="hidden" name="id" value={modal.item.id} />}
                  <MField label="ชื่อส่วนลด">
                    <MText name="label" defaultValue={modal.item?.label} placeholder="เช่น สิทธิ์พนักงาน" />
                  </MField>
                  <MField label="เปอร์เซ็นต์ส่วนลด (0–100)">
                    <MNum name="percent" defaultValue={modal.item?.percent ?? 0} max={100} />
                  </MField>
                  <MActions pending={pending} onCancel={close} label={modal.item ? 'บันทึก' : 'เพิ่มส่วนลด'} error={modalError} />
                </form>
              )}

              {modal.section === 'cleaning' && (
                <form key={modal.item?.id ?? 'new'} onSubmit={handleSubmit(upsertCleaningType)} className="space-y-4">
                  {modal.item && <input type="hidden" name="id" value={modal.item.id} />}
                  <MField label="ชื่อประเภทการทำความสะอาด">
                    <MText name="name" defaultValue={modal.item?.name} placeholder="เช่น ทำความสะอาดทั่วไป" />
                  </MField>
                  <MActions pending={pending} onCancel={close} label={modal.item ? 'บันทึก' : 'เพิ่มประเภท'} error={modalError} />
                </form>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Layout helpers ─────────────────────────────────────────────────────────────

function SectionRow({ title, label, onAdd }: { title: string; label: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-base font-semibold" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>
        {title}
      </h2>
      <button
        type="button"
        onClick={onAdd}
        className="btn-gold shrink-0"
        style={{ padding: '7px 16px', fontSize: '13px', fontWeight: 500 }}
      >
        {label}
      </button>
    </div>
  )
}

function TableCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: '12px',
      boxShadow: '0 1px 4px rgba(82,58,133,0.08), 0 0 0 1px rgba(82,58,133,0.06)',
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  )
}

function THead({ cols }: { cols: string[] }) {
  return (
    <thead style={{ backgroundColor: 'rgba(82,58,133,0.04)', borderBottom: '1px solid var(--border-soft)' }}>
      <tr>
        {cols.map((c, i) => (
          <th
            key={i}
            className="text-left py-2.5 pr-4 whitespace-nowrap"
            style={{
              paddingLeft: i === 0 ? '20px' : undefined,
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            {c}
          </th>
        ))}
      </tr>
    </thead>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <tr
      className="transition-colors hover:bg-[rgba(82,58,133,0.03)]"
      style={{ borderBottom: '1px solid var(--border-soft)' }}
    >
      {children}
    </tr>
  )
}

function NameCell({ children }: { children: React.ReactNode }) {
  return (
    <td className="py-3 pr-4 text-sm font-medium" style={{ paddingLeft: '20px', color: 'var(--text)' }}>
      {children}
    </td>
  )
}

function DataCell({ children }: { children: React.ReactNode }) {
  return <td className="py-3 pr-4 text-sm" style={{ color: 'var(--text-muted)' }}>{children}</td>
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="py-10 text-center text-sm" style={{ color: 'var(--text-light)' }}>
        ยังไม่มีข้อมูล
      </td>
    </tr>
  )
}

function ActionCell({ onEdit, toggleEl }: { onEdit: () => void; toggleEl: React.ReactNode }) {
  return (
    <td className="py-3 pr-5">
      <div className="flex gap-1.5 justify-end">
        <GhostBtn onClick={onEdit}>แก้ไข</GhostBtn>
        {toggleEl}
      </div>
    </td>
  )
}

// ── Visual atoms ───────────────────────────────────────────────────────────────

function Pill({ children, color }: { children: React.ReactNode; color: 'purple' | 'gold' }) {
  return (
    <span style={{
      background: color === 'purple' ? 'rgba(82,58,133,0.08)' : 'rgba(196,162,106,0.18)',
      color: color === 'purple' ? 'var(--primary)' : '#9A7430',
      borderRadius: '6px',
      fontSize: '12px',
      padding: '2px 8px',
      fontWeight: 500,
      display: 'inline-block',
    }}>
      {children}
    </span>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      background: active ? 'rgba(46,125,94,0.1)' : 'rgba(82,58,133,0.06)',
      color: active ? '#2E7D5E' : 'var(--text-muted)',
      borderRadius: '6px',
      fontSize: '12px',
      padding: '3px 8px',
      fontWeight: active ? 500 : 400,
      display: 'inline-block',
    }}>
      {active ? 'ใช้งาน' : 'ปิดใช้งาน'}
    </span>
  )
}

function GhostBtn({
  children, onClick, submit, danger,
}: {
  children: React.ReactNode
  onClick?: () => void
  submit?: boolean
  danger?: boolean
}) {
  return (
    <button
      type={submit ? 'submit' : 'button'}
      onClick={onClick}
      style={{
        background: 'none',
        border: `1px solid ${danger ? 'rgba(192,57,43,0.28)' : 'var(--border)'}`,
        color: danger ? '#C0392B' : 'var(--text-muted)',
        borderRadius: '6px',
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: 450,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function ToggleBtn({ active }: { active: boolean }) {
  return (
    <button type="submit"
      title={active ? 'ปิดใช้งานชั่วคราว (สามารถเปิดใหม่ได้)' : 'เปิดใช้งาน'}
      style={{
        background: 'none',
        border: `1px solid ${active ? 'rgba(180,120,0,0.30)' : 'rgba(46,125,94,0.3)'}`,
        color: active ? '#9A6F00' : '#2E7D5E',
        borderRadius: '6px',
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: 450,
        cursor: 'pointer',
      }}>
      {active ? 'ปิด' : 'เปิด'}
    </button>
  )
}

// ── Modal form helpers ─────────────────────────────────────────────────────────

function MField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
        {label}
      </span>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '9px 12px',
  fontSize: '14px',
  color: 'var(--text)',
  background: 'var(--bg)',
  outline: 'none',
}

function MText({ name, defaultValue, placeholder }: { name: string; defaultValue?: string; placeholder?: string }) {
  return <input name={name} defaultValue={defaultValue} placeholder={placeholder} style={inputStyle} />
}

function MNum({ name, defaultValue, max }: { name: string; defaultValue?: number; max?: number }) {
  return <input name={name} type="number" min={0} max={max} step={1} defaultValue={defaultValue ?? 0} style={inputStyle} />
}

function MSelect({ name, defaultValue, children }: { name: string; defaultValue?: string; children: React.ReactNode }) {
  return <select name={name} defaultValue={defaultValue} style={inputStyle}>{children}</select>
}

function MActions({ pending, onCancel, label, error }: { pending: boolean; onCancel: () => void; label: string; error?: string | null }) {
  return (
    <div className="space-y-3 pt-1">
      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(192,57,43,0.08)', color: '#C0392B' }}>
          {error}
        </p>
      )}
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onCancel}
        style={{
          background: 'none',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
          borderRadius: '8px',
          padding: '9px 16px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        ยกเลิก
      </button>
      <button
        type="submit"
        disabled={pending}
        style={{
          flex: 1,
          background: 'var(--primary)',
          color: '#fff',
          borderRadius: '8px',
          padding: '9px 16px',
          fontSize: '13px',
          fontWeight: 500,
          border: 'none',
          cursor: pending ? 'not-allowed' : 'pointer',
          opacity: pending ? 0.65 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {pending ? 'กำลังบันทึก…' : label}
      </button>
    </div>
    </div>
  )
}
