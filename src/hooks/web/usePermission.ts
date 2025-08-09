import { useUserStore } from '@/store/modules/user'

export const usePermission = () => {
  const userStore = useUserStore()

  const hasPermission = (permissions: string[]): boolean => {
    if (!permissions || permissions.length === 0) {
      return true
    }
    const userPermissions = userStore.getPermissions
    if (!userPermissions) {
      return false
    }
    const userPermissionArray = Array.from(userPermissions)
    return permissions.some((permission) => userPermissionArray.includes(permission))
  }

  return {
    hasPermission
  }
} 