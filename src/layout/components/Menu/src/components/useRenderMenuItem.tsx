import { ElSubMenu, ElMenuItem } from 'element-plus'
import { hasOneShowingChild } from '../helper'
import { isUrl } from '@/utils/is'
import { useRenderMenuTitle } from './useRenderMenuTitle'
import { pathResolve } from '@/utils/routerHelper'
import { useAppStore } from '@/store/modules/app'
import { computed, unref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RouteRecordRaw } from 'vue-router'

const { renderMenuTitle } = useRenderMenuTitle()

export const useRenderMenuItem = () =>
  // allRouters: AppRouteRecordRaw[] = [],
  {
    const appStore = useAppStore()
    const collapse = computed(() => appStore.getCollapse)
    const route = useRoute()
    const router = useRouter()
    
    // 检查当前路由是否匹配目标路径
    const isRouteActive = (path: string): boolean => {
      if (isUrl(path)) return false
      
      const currentPath = route.path
      
      // 精确匹配根路径
      if (path === '/') {
        return currentPath === path
      }
      
      // 检查当前路径是否匹配目标路径或是其子路径
      return currentPath.startsWith(path)
    }
    
    // 检查菜单项是否直接激活（精确匹配当前路由）
    const isDirectlyActive = (path: string): boolean => {
      if (isUrl(path)) return false
      
      const currentPath = route.path
      
      // 精确匹配
      return currentPath === path
    }
    
    // 递归检查菜单项是否应该被激活（包括其所有子项）
    const shouldMenuBeActive = (menuPath: string, children?: AppRouteRecordRaw[]): boolean => {
      // 直接匹配当前路径
      if (isRouteActive(menuPath)) return true
      
      // 检查子菜单
      if (children && children.length > 0) {
        return children.some(child => {
          const childPath = isUrl(child.path) ? child.path : pathResolve(menuPath, child.path)
          return shouldMenuBeActive(childPath, child.children)
        })
      }
      
      return false
    }
    
    // 检查菜单项是否有激活的子菜单（间接激活）
    const hasActiveChildItem = (item: RouteRecordRaw) => {
      if (!item.children?.length) return false;
      
      const { currentRoute } = router;
      const currentPath = currentRoute.value.path;
      
      // 检查子菜单中是否有与当前路径匹配的项
      const hasMatch = item.children.some(child => {
        // 递归检查
        if (child.children?.length) {
          return hasActiveChildItem(child);
        }
        
        // 检查当前子菜单项是否匹配
        const childPath = child.path;
        if (childPath === currentPath) return true;
        
        // 检查activeMenu
        if (child.meta?.activeMenu) {
          return child.meta.activeMenu === currentPath;
        }
        
        return false;
      });
      
      return hasMatch;
    };
    
    // 检查是否存在激活的子菜单
    const hasActiveSubmenu = (item: AppRouteRecordRaw, parentPath: string): boolean => {
      if (!item.children || item.children.length === 0) return false
      
      return item.children.some(child => {
        const childPath = isUrl(child.path) ? child.path : pathResolve(parentPath, child.path)
        // 直接检查当前子项
        if (isRouteActive(childPath)) return true
        // 递归检查子项的子菜单
        return hasActiveSubmenu(child, childPath)
      })
    }
    
    const renderMenuItem = (routers: AppRouteRecordRaw[], parentPath = '/', level = 1) => {
      return routers
        .filter((v) => !v.meta?.hidden)
        .map((v) => {
          const meta = v.meta ?? {}
          const { oneShowingChild, onlyOneChild } = hasOneShowingChild(v.children, v)
          const fullPath = isUrl(v.path) ? v.path : pathResolve(parentPath, v.path)
          
          // 检查此菜单项是否直接被激活（当前页面就是这个菜单对应的路径）
          const isActive = isDirectlyActive(fullPath)
          
          // 检查此菜单项是否应该被激活（包括其所有子菜单）
          const shouldBeActive = shouldMenuBeActive(fullPath, v.children)
          
          // 检查是否有子菜单被激活
          const hasActiveChild = hasActiveChildItem(v)
          
          // 确定菜单项的类名
          const getMenuItemClass = () => {
            if (unref(collapse)) {
              // 折叠状态下，只有直接激活的菜单项才显示完整激活样式
              if (isActive) {
                return 'is-active is-top-active el-menu-collapse-active menu-item-level-' + level
              } else if (hasActiveChild && !isActive) {
                // 有激活的子菜单但自身未激活，添加标记但不添加激活样式
                return 'has-active-child menu-item-level-' + level
              }
            } else {
              // 展开状态下的样式逻辑
              if (isActive) {
                return 'is-active menu-item-level-' + level
              } else if (hasActiveChild) {
                // 展开状态下，如果有激活的子菜单，标记但不添加完整激活样式
                return 'has-active-child menu-item-level-' + level
              }
            }
            return 'menu-item-level-' + level
          }
          
          // 处理叶子节点菜单
          if (
            oneShowingChild &&
            (!onlyOneChild?.children || onlyOneChild?.noShowingChildren) &&
            !meta?.alwaysShow
          ) {
            const finalPath = onlyOneChild ? pathResolve(fullPath, onlyOneChild.path) : fullPath
            const isThisActive = isDirectlyActive(finalPath)
            
            return (
              <ElMenuItem
                index={finalPath}
                class={isThisActive && unref(collapse) ? 'is-active is-top-active el-menu-collapse-active' : ''}
                data-menu-level={level}
                data-is-submenu={false}
                data-active={isThisActive}
                data-has-active-child={false}
                data-should-be-active={shouldBeActive}
              >
                {{
                  default: () => renderMenuTitle(onlyOneChild ? onlyOneChild?.meta : meta)
                }}
              </ElMenuItem>
            )
          } else {
            // 处理有子菜单的菜单项
            return (
              <ElSubMenu 
                index={fullPath}
                class={getMenuItemClass()}
                data-menu-level={level}
                data-is-submenu={true}
                data-active={isActive}
                data-has-active-child={hasActiveChild}
                data-should-be-active={shouldBeActive}
                popperClass={`submenu-popper level-${level}-popper ${shouldBeActive ? 'has-active-child' : ''} menu-level-${level}`}
              >
                {{
                  title: () => renderMenuTitle(meta),
                  default: () => renderMenuItem(v.children!, fullPath, level + 1)
                }}
              </ElSubMenu>
            )
          }
        })
    }

    return {
      renderMenuItem
    }
  }
