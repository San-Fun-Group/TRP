export const ROLE_RANK: Record<string, number> = {
  super_admin:  4,
  admin:        3,
  reception:    2,
  agent:        0,  // agent and housekeeping are peer-level; neither can manage the other
  housekeeping: 0,
}

// super_admin can manage anyone; others only manage users with strictly lower rank
export function canManage(myRole: string, targetRole: string): boolean {
  if (myRole === 'super_admin') return true
  return (ROLE_RANK[myRole] ?? -1) > (ROLE_RANK[targetRole] ?? -1)
}
