import { describe, it, expect } from 'vitest'
import { canManage } from './roles'

describe('canManage', () => {
  it('super_admin can manage everyone including other super_admins', () => {
    expect(canManage('super_admin', 'super_admin')).toBe(true)
    expect(canManage('super_admin', 'admin')).toBe(true)
    expect(canManage('super_admin', 'housekeeping')).toBe(true)
  })

  it('admin cannot manage super_admin', () => {
    expect(canManage('admin', 'super_admin')).toBe(false)
  })

  it('admin can manage all roles below admin', () => {
    expect(canManage('admin', 'reception')).toBe(true)
    expect(canManage('admin', 'agent')).toBe(true)
    expect(canManage('admin', 'housekeeping')).toBe(true)
  })

  it('admin cannot manage another admin (equal rank)', () => {
    expect(canManage('admin', 'admin')).toBe(false)
  })

  it('reception can manage agent and housekeeping', () => {
    expect(canManage('reception', 'agent')).toBe(true)
    expect(canManage('reception', 'housekeeping')).toBe(true)
  })

  it('reception cannot manage admin or super_admin', () => {
    expect(canManage('reception', 'admin')).toBe(false)
    expect(canManage('reception', 'super_admin')).toBe(false)
  })

  it('reception cannot manage another reception (equal rank)', () => {
    expect(canManage('reception', 'reception')).toBe(false)
  })

  it('agent cannot manage anyone', () => {
    expect(canManage('agent', 'housekeeping')).toBe(false)
    expect(canManage('agent', 'agent')).toBe(false)
    expect(canManage('agent', 'reception')).toBe(false)
  })

  it('housekeeping cannot manage anyone', () => {
    expect(canManage('housekeeping', 'housekeeping')).toBe(false)
    expect(canManage('housekeeping', 'agent')).toBe(false)
  })

  it('unknown role cannot manage anyone', () => {
    expect(canManage('unknown', 'agent')).toBe(false)
    expect(canManage('unknown', 'housekeeping')).toBe(false)
  })
})
