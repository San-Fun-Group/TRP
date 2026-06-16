'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { listUsers, createUser, updateUserRole, deleteUser, type AppRole } from '@/lib/actions/users'

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
  const [users, setUsers]           = useState<User[]>([])
  const [currentRole, setCurrentRole] = useState<string>('')
  const [loadErr, setLoadErr]       = useState<string | null>(null)
  const [actionErr, setActionErr]   = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [showLegend, setShowLegend] = useState(false)

  // Create form state
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole]         = useState<AppRole>('reception')

  const isSuperAdmin = currentRole === 'super_admin'
  // Admins can assign any role except super_admin (server enforces this too)
  const assignableRoles = isSuperAdmin ? ALL_ROLES : ALL_ROLES.filter(r => r !== 'super_admin')

  async function load() {
    const result = await listUsers()
    if (result.error) { setLoadErr(result.error); return }
    setUsers(result.users)
    setCurrentRole(result.currentRole ?? '')
  }

  useEffect(() => { load() }, [])

  function handleCreate() {
    setActionErr(null)
    const fd = new FormData()
    fd.set('email', email); fd.set('password', password); fd.set('role', role)
    startTransition(async () => {
      const res = await createUser(fd)
      if (res.error) { setActionErr(res.error); return }
      setEmail(''); setPassword(''); setShowCreate(false)
      await load()
    })
  }

  function handleRoleChange(userId: string, newRole: AppRole) {
    setActionErr(null)
    startTransition(async () => {
      const res = await updateUserRole(userId, newRole)
      if (res.error) { setActionErr(res.error); await load() }
      else await load()
    })
  }

  function handleDelete(userId: string, userEmail: string) {
    if (!confirm(`ลบบัญชี ${userEmail} ใช่หรือไม่?`)) return
    setActionErr(null)
    startTransition(async () => {
      const res = await deleteUser(userId)
      if (res.error) setActionErr(res.error)
      else await load()
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin" className="text-xs mb-2 inline-block" style={{ color: 'var(--text-light)' }}>
            ← Reception
          </Link>
          <h1 style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '2rem', fontWeight: 400, color: 'var(--primary)' }}>
            จัดการผู้ใช้งาน
          </h1>
        </div>
        <button
          onClick={() => { setShowCreate(v => !v); setActionErr(null) }}
          className="btn-gold px-4 py-2 text-xs font-medium tracking-widest uppercase shrink-0"
        >
          {showCreate ? '✕ ปิด' : '+ เพิ่มผู้ใช้'}
        </button>
      </div>

      {/* Role permissions legend */}
      <div className="card p-4">
        <button
          type="button"
          onClick={() => setShowLegend(v => !v)}
          className="w-full flex items-center justify-between text-xs font-medium tracking-widest uppercase"
          style={{ color: 'var(--text-light)' }}
        >
          <span>สิทธิ์การใช้งานแต่ละบทบาท</span>
          <span>{showLegend ? '▲' : '▼'}</span>
        </button>
        {showLegend && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {ALL_ROLES.map(r => (
              <div key={r} className="flex gap-2 p-2.5 rounded"
                style={{ backgroundColor: `${ROLE_COLOR[r]}0E`, border: `1px solid ${ROLE_COLOR[r]}25` }}>
                <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: ROLE_COLOR[r] }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: ROLE_COLOR[r] }}>{ROLE_LABEL[r]}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{ROLE_DESC[r]}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card p-5 space-y-4">
          <p className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--text-light)' }}>
            สร้างบัญชีใหม่
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs mb-1 block" style={{ color: 'var(--text-light)' }}>อีเมล</span>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                placeholder="user@example.com"
                className="w-full text-sm px-3 py-2 rounded"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }} />
            </label>
            <label className="block">
              <span className="text-xs mb-1 block" style={{ color: 'var(--text-light)' }}>รหัสผ่าน (≥8 ตัวอักษร)</span>
              <input value={password} onChange={e => setPassword(e.target.value)} type="password"
                placeholder="••••••••"
                className="w-full text-sm px-3 py-2 rounded"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }} />
            </label>
            <label className="block">
              <span className="text-xs mb-1 block" style={{ color: 'var(--text-light)' }}>สิทธิ์</span>
              <select value={role} onChange={e => setRole(e.target.value as AppRole)}
                className="w-full text-sm px-3 py-2 rounded"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
                {assignableRoles.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </label>
          </div>
          <button
            disabled={isPending || !email || !password}
            onClick={handleCreate}
            className="text-xs px-4 py-2 rounded font-medium transition-opacity disabled:opacity-40"
            style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
          >
            {isPending ? 'กำลังสร้าง…' : 'สร้างบัญชี'}
          </button>
        </div>
      )}

      {actionErr && (
        <p className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#C0392B18', color: '#C0392B' }}>
          {actionErr}
        </p>
      )}

      {loadErr && (
        <p className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#C0392B18', color: '#C0392B' }}>
          {loadErr}
        </p>
      )}

      {/* User list */}
      <div className="card overflow-x-auto px-5 pt-2 pb-1">
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
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <td className="py-3 pr-4 text-sm" style={{ color: 'var(--text)' }}>{u.email}</td>
                <td className="py-3 pr-4">
                  <select
                    key={u.id + '-' + u.role}
                    defaultValue={u.role}
                    disabled={isPending}
                    onChange={e => handleRoleChange(u.id, e.target.value as AppRole)}
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      border: `1px solid ${ROLE_COLOR[u.role] ?? '#AAA'}40`,
                      backgroundColor: `${ROLE_COLOR[u.role] ?? '#AAA'}18`,
                      color: ROLE_COLOR[u.role] ?? '#AAA',
                    }}
                  >
                    {assignableRoles.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    {/* Show current role even if not in assignable list (e.g. super_admin viewing another super_admin) */}
                    {!assignableRoles.includes(u.role as AppRole) && (
                      <option value={u.role}>{ROLE_LABEL[u.role] ?? u.role}</option>
                    )}
                  </select>
                </td>
                <td className="py-3 pr-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {thaiDate(u.created_at)}
                </td>
                <td className="py-3 pr-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {u.last_sign_in_at ? thaiDate(u.last_sign_in_at) : '—'}
                </td>
                <td className="py-3">
                  <button
                    disabled={isPending}
                    onClick={() => handleDelete(u.id, u.email)}
                    className="text-xs px-2 py-1 rounded transition-opacity disabled:opacity-40"
                    style={{ backgroundColor: '#C0392B18', color: '#C0392B' }}
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
            {!users.length && !loadErr && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm" style={{ color: 'var(--text-light)' }}>
                  กำลังโหลด…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
