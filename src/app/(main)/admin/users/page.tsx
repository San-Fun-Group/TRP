'use client'

import { useEffect, useState, useTransition } from 'react'
import { listUsers, createUser, updateUserRole, deleteUser } from '@/lib/actions/users'
import { canManage } from '@/lib/utils/roles'

type AppRole = 'super_admin' | 'admin' | 'reception' | 'agent' | 'housekeeping'

const ROLE_LABEL: Record<string, string> = {
  super_admin:  'Super Admin',
  admin:        'Admin',
  reception:    'Reception',
  agent:        'Agent',
  housekeeping: 'Housekeeping',
}
const ROLE_COLOR: Record<string, string> = {
  super_admin:  '#8475BB',
  admin:        '#6B5CA8',
  reception:    '#2E7D5E',
  agent:        '#C4A26A',
  housekeeping: '#888',
}
const ROLE_DESC: Record<string, string> = {
  super_admin:  'ควบคุมทุกอย่าง รวมถึงตั้งค่าสิทธิ์ Super Admin',
  admin:        'CRUD ทุกตาราง · ตั้งค่าระบบ · จัดการผู้ใช้',
  reception:    'จัดการการจอง (สถานะ / ชำระเงิน / ห้อง) · สร้างการจอง',
  agent:        'สร้างการจองเท่านั้น · อ่านข้อมูลการตั้งค่า',
  housekeeping: 'อ่านการจอง · อัปเดตประเภทงานทำความสะอาด',
}

const ALL_ROLES: AppRole[] = ['super_admin', 'admin', 'reception', 'agent', 'housekeeping']


interface User { id: string; email: string; role: string; created_at: string; last_sign_in_at: string | null }

function thaiDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: '2-digit',
  })
}

export default function UsersPage() {
  const [users,       setUsers]       = useState<User[]>([])
  const [loading,     setLoading]     = useState(true)
  const [currentRole, setCurrentRole] = useState<string>('')
  const [loadErr,     setLoadErr]     = useState<string | null>(null)
  const [actionErr,   setActionErr]   = useState<string | null>(null)
  const [isPending,   startTransition] = useTransition()

  // Add-user modal
  const [showAdd,  setShowAdd]  = useState(false)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [newRole,  setNewRole]  = useState<AppRole>('agent')
  const [createErr, setCreateErr] = useState<string | null>(null)

  // Inline role-change: userId → pending role
  const [roleEdits, setRoleEdits] = useState<Record<string, AppRole>>({})

  // Inline delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Role legend
  const [showLegend, setShowLegend] = useState(false)

  const assignableRoles = ALL_ROLES.filter(r => canManage(currentRole, r))

  async function load() {
    try {
      const result = await listUsers()
      if (result.error) { setLoadErr(result.error); return }
      setLoadErr(null)
      setUsers(result.users)
      setCurrentRole(result.currentRole ?? '')
    } catch {
      setLoadErr('ไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEmail(''); setPassword(''); setShowPass(false); setNewRole('agent')
    setCreateErr(null); setShowAdd(true)
  }

  function handleCreate() {
    setCreateErr(null)
    const fd = new FormData()
    fd.set('email', email); fd.set('password', password); fd.set('role', newRole)
    startTransition(async () => {
      try {
        const res = await createUser(fd)
        if (res.error) { setCreateErr(res.error); return }
        setShowAdd(false)
        await load()
      } catch {
        setCreateErr('ไม่สามารถสร้างผู้ใช้ได้ กรุณาลองใหม่')
      }
    })
  }

  function confirmRoleChange(userId: string) {
    const role = roleEdits[userId]
    if (!role) return
    setActionErr(null)
    startTransition(async () => {
      try {
        const res = await updateUserRole(userId, role)
        if (res.error) { setActionErr(res.error); return }
        setRoleEdits(prev => { const n = { ...prev }; delete n[userId]; return n })
        await load()
      } catch {
        setActionErr('ไม่สามารถเปลี่ยนสิทธิ์ได้ กรุณาลองใหม่')
      }
    })
  }

  function confirmDelete(userId: string) {
    setActionErr(null)
    startTransition(async () => {
      try {
        const res = await deleteUser(userId)
        if (res.error) { setActionErr(res.error); return }
        setDeletingId(null)
        await load()
      } catch {
        setActionErr('ไม่สามารถลบผู้ใช้ได้ กรุณาลองใหม่')
      }
    })
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '2rem', fontWeight: 400, color: 'var(--primary)' }}>
            จัดการผู้ใช้งาน
          </h1>
          {!loading && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-light)' }}>{users.length} บัญชี</p>
          )}
        </div>
        <button onClick={openAdd}
          className="btn-gold px-4 py-2 text-xs font-medium tracking-widest uppercase shrink-0">
          + เพิ่มผู้ใช้
        </button>
      </div>

      {/* Role legend — toggleable */}
      <div>
        <button type="button" onClick={() => setShowLegend(v => !v)}
          className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-60"
          style={{ color: 'var(--text-muted)' }}>
          <span style={{ fontSize: '10px' }}>{showLegend ? '▾' : '▸'}</span>
          สิทธิ์การเข้าถึง
        </button>
        {showLegend && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {ALL_ROLES.map(r => (
              <div key={r} className="flex gap-2 p-2.5 rounded-lg"
                style={{ backgroundColor: `${ROLE_COLOR[r]}0E`, border: `1px solid ${ROLE_COLOR[r]}25` }}>
                <span className="shrink-0 mt-1 w-2 h-2 rounded-full" style={{ backgroundColor: ROLE_COLOR[r] }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: ROLE_COLOR[r] }}>{ROLE_LABEL[r]}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{ROLE_DESC[r]}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {actionErr && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#C0392B18', color: '#C0392B' }}>
          {actionErr}
        </p>
      )}
      {loadErr && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#C0392B18', color: '#C0392B' }}>
          {loadErr}
        </p>
      )}

      {/* User table */}
      <div className="card overflow-x-auto px-5 pt-2 pb-1"
        style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['อีเมล', 'สิทธิ์', 'วันที่สร้าง', 'เข้าสู่ระบบล่าสุด', ''].map(h => (
                <th key={h} className="text-left pb-2 pr-4 font-medium text-xs tracking-wide"
                  style={{ color: 'var(--text-light)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  {[140, 80, 70, 80, 40].map((w, j) => (
                    <td key={j} className="py-3 pr-4">
                      <div className="h-3 rounded animate-pulse"
                        style={{ width: w, backgroundColor: 'var(--border-soft)' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 && !loadErr ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm" style={{ color: 'var(--text-light)' }}>
                  ยังไม่มีผู้ใช้งาน
                </td>
              </tr>
            ) : users.map(u => {
              const manageable  = canManage(currentRole, u.role)
              const color       = ROLE_COLOR[u.role] ?? '#AAA'
              const pendingRole = roleEdits[u.id]
              const roleChanged = pendingRole !== undefined && pendingRole !== u.role
              const isDeleting  = deletingId === u.id

              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>

                  <td className="py-3 pr-4 text-sm" style={{ color: 'var(--text)' }}>{u.email}</td>

                  <td className="py-3 pr-4">
                    {manageable ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <select
                          value={pendingRole ?? u.role}
                          disabled={isPending}
                          onChange={e => setRoleEdits(prev => ({ ...prev, [u.id]: e.target.value as AppRole }))}
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            border: `1px solid ${roleChanged ? 'var(--primary)' : `${color}40`}`,
                            backgroundColor: roleChanged ? 'rgba(82,58,133,0.06)' : `${color}18`,
                            color: roleChanged ? 'var(--primary)' : color,
                          }}
                        >
                          {assignableRoles.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                          {!assignableRoles.includes(u.role as AppRole) && (
                            <option value={u.role}>{ROLE_LABEL[u.role] ?? u.role}</option>
                          )}
                        </select>
                        {roleChanged && (
                          <>
                            <button type="button" onClick={() => confirmRoleChange(u.id)} disabled={isPending}
                              className="text-[11px] px-2 py-0.5 rounded font-medium"
                              style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
                              ยืนยัน
                            </button>
                            <button type="button"
                              onClick={() => setRoleEdits(prev => { const n = { ...prev }; delete n[u.id]; return n })}
                              className="text-[11px] px-2 py-0.5 rounded"
                              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                              ยกเลิก
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded select-none"
                        style={{ border: `1px solid ${color}30`, backgroundColor: `${color}10`, color }}
                        title="ไม่มีสิทธิ์แก้ไขผู้ใช้ที่มีสิทธิ์เท่ากันหรือสูงกว่า">
                        <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true">
                          <rect x="1" y="5" width="8" height="7" rx="1.5" fill="currentColor" opacity=".35"/>
                          <path d="M3 5V3.5a2 2 0 0 1 4 0V5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
                        </svg>
                        {ROLE_LABEL[u.role] ?? u.role}
                      </span>
                    )}
                  </td>

                  <td className="py-3 pr-4 text-xs" style={{ color: 'var(--text-muted)' }}>{thaiDate(u.created_at)}</td>
                  <td className="py-3 pr-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {u.last_sign_in_at ? thaiDate(u.last_sign_in_at) : '—'}
                  </td>

                  <td className="py-3">
                    {manageable ? (
                      isDeleting ? (
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>ลบบัญชีนี้?</span>
                          <button type="button" onClick={() => confirmDelete(u.id)} disabled={isPending}
                            className="text-xs px-2 py-1 rounded font-medium"
                            style={{ backgroundColor: '#C0392B', color: '#fff' }}>
                            ยืนยัน
                          </button>
                          <button type="button" onClick={() => setDeletingId(null)}
                            className="text-xs px-2 py-1 rounded"
                            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button type="button" disabled={isPending}
                          onClick={() => setDeletingId(u.id)}
                          className="text-xs px-2 py-1 rounded transition-opacity disabled:opacity-40"
                          style={{ backgroundColor: '#C0392B18', color: '#C0392B' }}>
                          ลบ
                        </button>
                      )
                    ) : (
                      <span className="text-xs px-2 py-1" style={{ color: 'var(--text-light)' }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add-user modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setShowAdd(false)}
            style={{ backgroundColor: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(4px)' }} />
          <div className="relative card w-full max-w-md"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.14), 0 0 0 1px rgba(82,58,133,0.07)' }}>

            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>สร้างบัญชีใหม่</span>
              <button onClick={() => setShowAdd(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: '20px', lineHeight: 1, padding: '2px 4px', borderRadius: '4px' }}>
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              <label className="block">
                <span className="block mb-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>อีเมล</span>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                  placeholder="user@example.com" autoFocus
                  className="w-full text-sm px-3 py-2.5 rounded-lg outline-none"
                  style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)' }} />
              </label>

              <label className="block">
                <span className="block mb-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>รหัสผ่าน (≥8 ตัวอักษร)</span>
                <div className="relative">
                  <input value={password} onChange={e => setPassword(e.target.value)}
                    type={showPass ? 'text' : 'password'} placeholder="••••••••"
                    className="w-full text-sm px-3 py-2.5 pr-10 rounded-lg outline-none"
                    style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)' }} />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-60"
                    style={{ color: 'var(--text-light)' }} aria-label={showPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>
                    {showPass ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="block mb-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>สิทธิ์</span>
                <select value={newRole} onChange={e => setNewRole(e.target.value as AppRole)}
                  className="w-full text-sm px-3 py-2.5 rounded-lg"
                  style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
                  {assignableRoles.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </label>

              {createErr && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#C0392B18', color: '#C0392B' }}>
                  {createErr}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowAdd(false)}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                  ยกเลิก
                </button>
                <button type="button"
                  disabled={isPending || !email || password.length < 8}
                  onClick={handleCreate}
                  style={{ flex: 1, background: 'var(--primary)', color: '#fff', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 500, border: 'none', opacity: (isPending || !email || password.length < 8) ? 0.5 : 1, cursor: (isPending || !email || password.length < 8) ? 'not-allowed' : 'pointer', transition: 'opacity 0.15s' }}>
                  {isPending ? 'กำลังสร้าง…' : 'สร้างบัญชี'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
