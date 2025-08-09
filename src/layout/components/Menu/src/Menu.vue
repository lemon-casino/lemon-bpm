<script lang="tsx">
import { PropType } from 'vue'
import { ElMenu, ElScrollbar } from 'element-plus'
import { useAppStore } from '@/store/modules/app'
import { usePermissionStore } from '@/store/modules/permission'
import { useRenderMenuItem } from './components/useRenderMenuItem'
import { isUrl } from '@/utils/is'
import { useDesign } from '@/hooks/web/useDesign'
import { LayoutType } from '@/types/layout'
import { onMounted, onBeforeUnmount } from 'vue'

const { getPrefixCls } = useDesign()

const prefixCls = getPrefixCls('menu')

export default defineComponent({
  // eslint-disable-next-line vue/no-reserved-component-names
  name: 'Menu',
  props: {
    menuSelect: {
      type: Function as PropType<(index: string) => void>,
      default: undefined
    }
  },
  setup(props) {
    const appStore = useAppStore()

    const layout = computed(() => appStore.getLayout)

    const { push, currentRoute } = useRouter()

    const permissionStore = usePermissionStore()

    const menuMode = computed((): 'vertical' | 'horizontal' => {
      // 竖
      const vertical: LayoutType[] = ['classic', 'topLeft', 'cutMenu']

      if (vertical.includes(unref(layout))) {
        return 'vertical'
      } else {
        return 'horizontal'
      }
    })

    const routers = computed(() =>
      unref(layout) === 'cutMenu' ? permissionStore.getMenuTabRouters : permissionStore.getRouters
    )

    const collapse = computed(() => appStore.getCollapse)

    const uniqueOpened = computed(() => appStore.getUniqueOpened)

    const activeMenu = computed(() => {
      const { meta, path } = unref(currentRoute)
      // if set path, the sidebar will highlight the path you set
      if (meta.activeMenu) {
        return meta.activeMenu as string
      }
      return path
    })

    const menuSelect = (index: string) => {
      if (props.menuSelect) {
        props.menuSelect(index)
      }
      // 自定义事件
      if (isUrl(index)) {
        window.open(index)
      } else {
        push(index)
      }
    }

    const renderMenuWrap = () => {
      if (unref(layout) === 'top') {
        return renderMenu()
      } else {
        return <ElScrollbar>{renderMenu()}</ElScrollbar>
      }
    }

    const renderMenu = () => {
      return (
        <ElMenu
          defaultActive={unref(activeMenu)}
          mode={unref(menuMode)}
          collapse={
            unref(layout) === 'top' || unref(layout) === 'cutMenu' ? false : unref(collapse)
          }
          uniqueOpened={unref(layout) === 'top' ? false : unref(uniqueOpened)}
          backgroundColor="var(--left-menu-bg-color)"
          textColor="var(--left-menu-text-color)"
          activeTextColor="var(--left-menu-text-active-color)"
          popperClass={
            unref(menuMode) === 'vertical'
              ? `${prefixCls}-popper--vertical`
              : `${prefixCls}-popper--horizontal`
          }
          onSelect={menuSelect}
          onOpen={handleSubMenuOpen}
        >
          {{
            default: () => {
              const { renderMenuItem } = useRenderMenuItem()
              return renderMenuItem(unref(routers))
            }
          }}
        </ElMenu>
      )
    }
    
    // 处理子菜单打开事件
    const handleSubMenuOpen = (index: string) => {
      // 延迟执行，确保DOM已更新
      setTimeout(() => {
        // 强制处理嵌套菜单
        forceNestedMenuDisplay();
      }, 50);
    };

    // 设置弹出菜单层级监听
    const setupNestedPopupMenus = () => {
      // 使用MutationObserver监听DOM变化，为弹出的菜单添加层级属性
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node: any) => {
              if (node.nodeType === 1) { // 元素节点
                // 查找新添加的弹出菜单
                const popups = document.querySelectorAll('.el-menu--popup');
                
                popups.forEach((popup) => {
                  if (!popup.hasAttribute('data-level')) {
                    // 查找它的父级弹出菜单层级
                    const parentClass = Array.from(popup.classList).find(cls => cls.includes('menu-level-'));
                    if (parentClass) {
                      const level = parentClass.split('-').pop();
                      if (level) {
                        popup.setAttribute('data-level', level);
                      }
                    } else {
                      // 如果找不到父级层级，默认为第一级
                      popup.setAttribute('data-level', '1');
                    }

                    // 检查菜单位置并调整，防止超出屏幕
                    adjustMenuPosition(popup as HTMLElement);
                  }
                });
                
                // 特殊处理：确保子菜单弹出时父菜单也可见
                fixNestedMenuVisibility();
              }
            });
          }
        });
      });
      
      // 监听document.body的变化
      observer.observe(document.body, { childList: true, subtree: true });
      
      return observer;
    };
    
    // 修复嵌套菜单的可见性问题
    const fixNestedMenuVisibility = () => {
      // 查找所有已打开的子菜单
      const openedSubmenus = document.querySelectorAll('.el-menu--popup .el-sub-menu.is-opened');
      
      openedSubmenus.forEach((submenu) => {
        // 查找此子菜单的弹出菜单
        const popup = submenu.querySelector('.el-menu--popup');
        if (popup) {
          // 调整弹出菜单的位置和样式
          const popupEl = popup as HTMLElement;
          
          // 确保子菜单弹出层可见
          popupEl.style.display = 'block';
          popupEl.style.visibility = 'visible';
          popupEl.style.opacity = '1';
          popupEl.style.transform = 'none';
          
          // 设置正确的位置
          popupEl.style.position = 'absolute';
          popupEl.style.left = '100%';
          popupEl.style.top = '0';
          popupEl.style.minWidth = '180px';
          
          // 添加适当的样式
          popupEl.style.backgroundColor = '#031930';
          popupEl.style.borderRadius = '4px';
          popupEl.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
          popupEl.style.zIndex = '2001';
          
          // 检查并调整位置
          adjustMenuPosition(popupEl);
        }
      });
      
      // 强制处理多级嵌套菜单的显示
      forceNestedMenuDisplay();
    };
    
    // 强制显示嵌套的多级菜单
    const forceNestedMenuDisplay = () => {
      // 延迟执行，确保DOM已更新
      setTimeout(() => {
        // 处理所有折叠状态下的菜单
        if (appStore.getCollapse) {
          // 查找所有菜单容器
          const popupContainers = document.querySelectorAll('.el-menu--popup-container');
          
          popupContainers.forEach(container => {
            // 查找容器内的菜单
            const popup = container.querySelector('.el-menu--popup') as HTMLElement;
            if (popup) {
              // 确保菜单可见
              popup.style.display = 'block';
              popup.style.visibility = 'visible';
              popup.style.opacity = '1';
              
              // 查找并处理此菜单内的子菜单
              const submenus = popup.querySelectorAll('.el-sub-menu');
              submenus.forEach(submenu => {
                // 如果子菜单被打开
                if (submenu.classList.contains('is-opened')) {
                  // 查找子菜单的弹出层
                  const childPopup = submenu.querySelector('.el-menu--popup') as HTMLElement;
                  if (childPopup) {
                    // 确保子菜单弹出层可见
                    childPopup.style.display = 'block';
                    childPopup.style.visibility = 'visible';
                    childPopup.style.opacity = '1';
                    childPopup.style.transform = 'none';
                    
                    // 获取父菜单项的位置信息
                    const submenuRect = (submenu as HTMLElement).getBoundingClientRect();
                    const popupRect = popup.getBoundingClientRect();
                    
                    // 设置正确的位置 - 使用fixed定位，摆脱父级宽度限制
                    childPopup.style.position = 'fixed';
                    childPopup.style.left = `${submenuRect.right + 5}px`; // 父菜单右侧加5px间距
                    childPopup.style.top = `${submenuRect.top}px`;
                    childPopup.style.minWidth = '220px'; // 确保足够宽度
                    childPopup.style.zIndex = '3001'; // 高于父菜单的z-index
                    
                    // 添加适当的样式
                    childPopup.style.backgroundColor = '#031930';
                    childPopup.style.borderRadius = '8px';
                    childPopup.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.5)';
                    childPopup.style.border = 'none';
                    childPopup.style.padding = '5px';
                    
                    // 调整位置避免超出屏幕
                    adjustPopupPosition(childPopup, submenuRect);
                    
                    // 递归处理更深层级的菜单
                    const nestedSubmenus = childPopup.querySelectorAll('.el-sub-menu.is-opened');
                    nestedSubmenus.forEach(nestedSubmenu => {
                      const nestedPopup = nestedSubmenu.querySelector('.el-menu--popup') as HTMLElement;
                      if (nestedPopup) {
                        // 获取父菜单项的位置信息
                        const nestedSubmenuRect = (nestedSubmenu as HTMLElement).getBoundingClientRect();
                        
                        // 确保孙子级菜单可见
                        nestedPopup.style.display = 'block';
                        nestedPopup.style.visibility = 'visible';
                        nestedPopup.style.opacity = '1';
                        
                        // 设置孙子级菜单的位置 - 使用fixed定位
                        nestedPopup.style.position = 'fixed';
                        nestedPopup.style.left = `${nestedSubmenuRect.right + 5}px`;
                        nestedPopup.style.top = `${nestedSubmenuRect.top}px`;
                        nestedPopup.style.minWidth = '220px';
                        nestedPopup.style.zIndex = '3002';
                        
                        // 调整深层菜单的样式
                        nestedPopup.style.backgroundColor = '#001529';
                        nestedPopup.style.borderRadius = '8px';
                        nestedPopup.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.5)';
                        nestedPopup.style.border = 'none';
                        nestedPopup.style.borderLeft = '2px solid #52c41a';
                        nestedPopup.style.padding = '5px';
                        
                        // 确保不超出屏幕
                        adjustPopupPosition(nestedPopup, nestedSubmenuRect);
                      }
                    });
                  }
                }
              });
            }
          });
        }
      }, 50); // 短暂延迟，确保DOM已更新
    };
    
    // 调整弹出菜单位置，确保不超出屏幕
    const adjustPopupPosition = (popup: HTMLElement, parentRect: DOMRect) => {
      const rect = popup.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      // 检查右侧是否超出屏幕
      if (rect.right > windowWidth - 20) {
        // 改为显示在父菜单的左侧
        popup.style.left = `${parentRect.left - rect.width - 5}px`; // 父菜单左侧减去弹出菜单宽度和5px间距
        // 添加样式指示器
        popup.classList.add('popup-left-side');
      }
      
      // 检查底部是否超出屏幕
      if (rect.bottom > windowHeight - 20) {
        // 如果弹出菜单高度小于视口高度的80%，则上移菜单
        if (rect.height < windowHeight * 0.8) {
          // 计算需要上移的距离
          const topAdjust = rect.bottom - (windowHeight - 20);
          popup.style.top = `${parseFloat(popup.style.top) - topAdjust}px`;
        } else {
          // 菜单高度接近视口高度，改为显示在顶部并限制高度
          popup.style.top = '20px';
          popup.style.maxHeight = `${windowHeight - 40}px`;
          popup.style.overflowY = 'auto';
        }
      }
      
      // 检查顶部是否超出屏幕
      if (rect.top < 20) {
        popup.style.top = '20px';
      }
    };

    // 调整菜单位置，确保不超出屏幕
    const adjustMenuPosition = (menuEl: HTMLElement) => {
      if (!menuEl) return;
      
      setTimeout(() => {
        const rect = menuEl.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // 检查右侧是否超出屏幕
        if (rect.right > windowWidth - 20) {
          menuEl.style.left = 'auto';
          menuEl.style.right = '100%';
          menuEl.style.marginLeft = '0';
          menuEl.style.marginRight = '5px';
          menuEl.classList.add('el-menu--popup-right-side');
        }
        
        // 检查底部是否超出屏幕
        if (rect.bottom > windowHeight - 20) {
          const overflowY = rect.bottom - (windowHeight - 20);
          
          // 情况1: 如果菜单高度小于视口高度，调整top值即可
          if (rect.height < windowHeight - 40) {
            // 计算新的top位置，确保菜单底部不超出屏幕
            const newTop = Math.max(20, parseInt(menuEl.style.top || '0') - overflowY);
            menuEl.style.top = `${newTop}px`;
          }
          // 情况2: 如果菜单高度大于视口高度，设置最大高度并开启滚动
          else {
            menuEl.style.top = '20px';
            menuEl.style.maxHeight = `${windowHeight - 40}px`;
            menuEl.style.overflowY = 'auto';
          }
        }
        
        // 检查顶部是否超出屏幕
        if (rect.top < 20) {
          menuEl.style.top = '20px';
        }
        
        // 特别处理深层嵌套菜单
        const level = menuEl.getAttribute('data-level');
        if (level && parseInt(level) > 1) {
          // 深层级菜单添加滚动条
          if (menuEl.scrollHeight > windowHeight - 40) {
            menuEl.style.maxHeight = `${windowHeight - 40}px`;
            menuEl.style.overflowY = 'auto';
            
            // 确保子菜单项样式正确
            const menuItems = menuEl.querySelectorAll('.el-menu-item');
            menuItems.forEach((item: any) => {
              item.style.width = 'calc(100% - 10px)';
              item.style.boxSizing = 'border-box';
            });
          }
          
          // 处理多重嵌套的情况
          const parentMenu = menuEl.parentElement?.closest('.el-menu--popup');
          if (parentMenu) {
            // 确保父菜单和子菜单都完全可见
            const parentRect = parentMenu.getBoundingClientRect();
            
            // 如果父菜单位于右侧（通过检查class），子菜单应显示在左侧
            if (parentMenu.classList.contains('el-menu--popup-right-side')) {
              menuEl.style.left = 'auto';
              menuEl.style.right = '100%';
              menuEl.classList.add('el-menu--popup-right-side');
            }
            
            // 避免子菜单垂直方向超出屏幕
            if (rect.bottom > windowHeight - 20 && rect.height < windowHeight - 40) {
              // 计算向上偏移量，确保不超出屏幕底部
              const topOffset = Math.min(rect.bottom - (windowHeight - 20), rect.height);
              menuEl.style.top = `${parseInt(menuEl.style.top || '0') - topOffset}px`;
            }
          }
        }
      }, 0);
    };

    let observer: MutationObserver | null = null;
    
    onMounted(() => {
      // 设置弹出菜单层级监听
      observer = setupNestedPopupMenus();
      
      // 添加全局点击事件监听，用于处理菜单项点击后的状态更新
      document.addEventListener('click', handleDocumentClick);
      
      // 添加窗口大小变化监听，用于调整菜单位置
      window.addEventListener('resize', handleWindowResize);
    });
    
    onBeforeUnmount(() => {
      // 在组件销毁前取消监听
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      
      // 移除全局事件监听
      document.removeEventListener('click', handleDocumentClick);
      window.removeEventListener('resize', handleWindowResize);
    });
    
    // 处理全局点击事件
    const handleDocumentClick = () => {
      // 当有点击事件时，检查并处理菜单状态
      setTimeout(() => {
        forceNestedMenuDisplay();
      }, 100);
    };
    
    // 处理窗口大小变化
    const handleWindowResize = () => {
      // 窗口大小变化时，重新调整菜单位置
      setTimeout(() => {
        const openedMenus = document.querySelectorAll('.el-menu--popup');
        openedMenus.forEach(menu => {
          const parentSubmenu = menu.closest('.el-sub-menu');
          if (parentSubmenu) {
            const parentRect = parentSubmenu.getBoundingClientRect();
            adjustPopupPosition(menu as HTMLElement, parentRect);
          }
        });
      }, 100);
    };

    return () => (
      <div
        id={prefixCls}
        class={[
          `${prefixCls} ${prefixCls}__${unref(menuMode)}`,
          'h-[100%] overflow-hidden flex-col bg-[var(--left-menu-bg-color)]',
          {
            'w-[var(--left-menu-min-width)]': unref(collapse) && unref(layout) !== 'cutMenu',
            'w-[var(--left-menu-max-width)]': !unref(collapse) && unref(layout) !== 'cutMenu'
          }
        ]}
      >
        {renderMenuWrap()}
      </div>
    )
  }
})
</script>

<style lang="scss" scoped>
$prefix-cls: #{$namespace}-menu;

.#{$prefix-cls} {
  position: relative;
  transition: width var(--transition-time-02);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);

  // 添加图标样式
  :deep(.menu-icon-wrapper) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-right: 10px;
    transition: all 0.3s;
    
    .menu-icon {
      font-size: 18px;
      line-height: 1;
      transition: all 0.3s;
      
      &.is-collapsed {
        font-size: 20px; // 折叠时图标略大
        margin: 0 auto;
      }
    }
  }

  :deep(.#{$elNamespace}-menu) {
    width: 100% !important;
    border-right: none;
    --menu-bg-color: #001529; /* 深蓝色背景，与Logo风格匹配 */
    --submenu-bg-color: #1a4663; /* 稍亮的深蓝色用于子菜单 */
    --third-level-bg-color: #031930; /* 更亮的深蓝色用于三级菜单 */
    --menu-item-hover-bg: #1c3c5e; /* 悬停背景色 */
    background-color: var(--menu-bg-color) !important;

    // 设置选中时子标题的颜色
    .is-active {
      & > .#{$elNamespace}-sub-menu__title {
        color: var(--left-menu-text-active-color) !important;
        font-weight: 600;
        letter-spacing: 0.5px;
      }
    }

    // 设置子菜单悬停的高亮和背景色
    .#{$elNamespace}-sub-menu__title,
    .#{$elNamespace}-menu-item {
      position: relative;
      margin: 6px 10px;
      border-radius: 6px;
      height: 44px;
      line-height: 44px;
      transition: all 0.3s ease;
      
      &:hover {
        color: var(--left-menu-text-active-color) !important;
        background-color: var(--menu-item-hover-bg) !important;
        transform: translateX(4px);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      }
    }

    // 设置选中时的高亮背景和高亮颜色
    .#{$elNamespace}-menu-item.is-active {
      color: var(--left-menu-text-active-color) !important;
      background: linear-gradient(90deg, #1890ff, #0c60b3) !important;
      font-weight: 600;
      border-radius: 6px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);

      &:hover {
        background: linear-gradient(90deg, #1890ff, #1064b5) !important;
      }
    }

    .#{$elNamespace}-menu-item.is-active {
      position: relative;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        width: 4px;
        height: 100%;
        background-color: #fff;
        border-radius: 4px 0 0 4px;
      }
    }

    // 一级菜单样式 - 移除自定义箭头，美化Element Plus默认箭头
    & > .#{$elNamespace}-sub-menu > .#{$elNamespace}-sub-menu__title {
      font-size: 14px;
      font-weight: 500;
      border-radius: 6px;
      margin: 6px 10px;
      position: relative;
      
      // 移除之前添加的自定义箭头
      &::after {
        display: none;
      }
      
      // 美化Element Plus默认箭头
      .#{$elNamespace}-sub-menu__icon-arrow {
        font-size: 12px;
        font-weight: 600;
        margin-right: 8px;
        color: rgba(255, 255, 255, 0.7);
        transition: transform 0.3s;
      }
    }
    
    // 自定义箭头在展开状态的样式
    .#{$elNamespace}-sub-menu.is-opened > .#{$elNamespace}-sub-menu__title {
      .#{$elNamespace}-sub-menu__icon-arrow {
        color: var(--left-menu-text-active-color);
      }
    }

    // 设置子菜单的背景颜色
    .#{$elNamespace}-menu {
      background-color: var(--submenu-bg-color) !important;
      margin: 0 5px;
      border-radius: 6px;
      padding: 5px 0;
      position: relative;
      
      // 为子菜单添加边框指示器，增强层级感
      &::before {
        content: '';
        position: absolute;
        left: 20px;
        top: 0;
        height: 100%;
        width: 2px;
        background: linear-gradient(to bottom, 
          rgba(255, 255, 255, 0.05),
          rgba(255, 255, 255, 0.2),
          rgba(255, 255, 255, 0.05)
        );
      }
      
      .#{$elNamespace}-sub-menu__title,
      .#{$elNamespace}-menu-item:not(.is-active) {
        padding-left: 40px !important;
        margin: 4px 5px;
        height: 40px;
        line-height: 40px;
        color: rgba(255, 255, 255, 0.8);
        
        &::before {
          content: '';
          position: absolute;
          left: 19px;
          top: 50%;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-50%);
        }
      }
      
      // 三级菜单及更深层级的样式
      .#{$elNamespace}-menu {
        background-color: var(--third-level-bg-color) !important;
        margin: 0 5px 0 10px; // 左侧边距更大，增强层级感
        border-radius: 6px;
        border-left: 1px solid rgba(255, 255, 255, 0.1); // 添加左侧边框
        
        .#{$elNamespace}-sub-menu__title,
        .#{$elNamespace}-menu-item:not(.is-active) {
          padding-left: 45px !important; // 更大的缩进
          height: 38px; // 稍小的高度
          line-height: 38px;
          font-size: 13px; // 稍小的字体
          
          &::before {
            left: 25px; // 点的位置调整
            width: 3px; // 稍小的点
            height: 3px;
          }
        }
        
        // 四级及更深层级
        .#{$elNamespace}-menu {
          background-color: rgba(255, 255, 255, 0.05) !important; // 背景略微透明
          margin-left: 15px;
          
          .#{$elNamespace}-menu-item:not(.is-active) {
            padding-left: 50px !important; // 更大的缩进
            height: 36px; // 更小的高度
            line-height: 36px;
            
            &::before {
              left: 32px;
              width: 2px;
              height: 2px;
            }
          }
        }
      }
      
      // 子菜单项的悬停效果
      .#{$elNamespace}-menu-item:not(.is-active):hover {
        background-color: rgba(255, 255, 255, 0.1) !important;
        color: var(--left-menu-text-active-color) !important;
      }
    }

    // 增加菜单项间分隔
    & > .#{$elNamespace}-sub-menu:after {
      content: '';
      display: block;
      margin: 5px 15px;
      height: 1px;
      background: linear-gradient(to right, 
        rgba(255, 255, 255, 0),
        rgba(255, 255, 255, 0.1),
        rgba(255, 255, 255, 0)
      );
    }
    
    // 最后一项不显示分隔线
    & > .#{$elNamespace}-sub-menu:last-child:after {
      display: none;
    }
  }

  // 折叠时的最小宽度
  :deep(.#{$elNamespace}-menu--collapse) {
    width: var(--left-menu-min-width);
    
    // 确保折叠时图标居中
    .#{$elNamespace}-sub-menu,
    .#{$elNamespace}-menu-item {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      padding: 0 !important;
      text-align: center;
      
      .menu-icon-wrapper {
        margin: 0 auto;
      }
      
      &:hover {
        background-color: var(--menu-item-hover-bg) !important;
      }
    }

    // 顶级菜单激活样式 - 用于折叠状态下的所有菜单项
    .is-top-active {
      position: relative;
      background: linear-gradient(90deg, #1890ff, #0c60b3) !important;
      border-radius: 6px;
      margin: 6px 8px;
      color: white !important;
      
      .menu-icon-wrapper .menu-icon {
        color: white !important;
      }
      
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        width: 3px;
        height: 100%;
        background-color: #fff;
        border-radius: 3px 0 0 3px;
      }
    }
    
    // 原有激活样式保留，但简化
    & > .is-active,
    & > .is-active > .#{$elNamespace}-sub-menu__title {
      position: relative !important;
      background: #1278da;
      border-radius: 6px !important;

      color: white !important; 
      z-index: 2 !important;
    }
  }

  // 折叠动画的时候，就需要把文字给隐藏掉
  :deep(.horizontal-collapse-transition) {
    .#{$prefix-cls}__title {
      display: none;
    }
  }

  // 垂直菜单
  &__vertical {
    :deep(.#{$elNamespace}-menu--vertical) {
      &:not(.#{$elNamespace}-menu--collapse) .#{$elNamespace}-sub-menu__title,
      .#{$elNamespace}-menu-item {
        padding-right: 0;
      }
      
      // 增强垂直菜单的层次感
      .#{$elNamespace}-sub-menu .#{$elNamespace}-menu--inline {
        padding-left: 0 !important;
      }
    }
  }

  // 水平菜单
  &__horizontal {
    height: calc(var(--top-tool-height)) !important;

    :deep(.#{$elNamespace}-menu--horizontal) {
      height: calc(var(--top-tool-height));
      border-bottom: none;
      // 重新设置底部高亮颜色
      & > .#{$elNamespace}-sub-menu.is-active {
        .#{$elNamespace}-sub-menu__title {
          border-bottom-color: var(--el-color-primary) !important;
          font-weight: 600;
        }
      }

      .#{$elNamespace}-menu-item.is-active {
        position: relative;

        &::after {
          display: none !important;
        }
      }

      .#{$prefix-cls}__title {
        /* stylelint-disable-next-line */
        max-height: calc(var(--top-tool-height) - 2px) !important;
        /* stylelint-disable-next-line */
        line-height: calc(var(--top-tool-height) - 2px);
      }
    }
  }
}
</style>

<style lang="scss" scoped>
$prefix-cls: #{$namespace}-menu-popper;

.#{$prefix-cls}--vertical,
.#{$prefix-cls}--horizontal {
  // 设置选中时子标题的颜色
  .is-active {
    & > .el-sub-menu__title {
      color: var(--left-menu-text-active-color) !important;
      font-weight: 600;
    }
  }
  
  // 为弹出菜单添加样式优化
  .el-menu {
    background: #0c2238 !important; // 深蓝色背景
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    padding: 5px;
    max-height: calc(100vh - 120px); // 限制最大高度
    overflow-y: auto; // 添加垂直滚动条
    overscroll-behavior: contain; // 防止滚动穿透
    
    // 滚动条样式优化
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-thumb {
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
    }
    
    &::-webkit-scrollbar-track {
      background-color: rgba(0, 0, 0, 0.1);
      border-radius: 3px;
    }
    
    // 确保弹出菜单不会太窄
    min-width: 200px;
    
    .el-menu-item {
      height: 40px;
      line-height: 40px;
      margin: 4px 6px;
      border-radius: 6px;
      position: relative;
      color: rgba(255, 255, 255, 0.8);
      padding: 0 20px 0 45px !important; // 统一的左侧内边距
      font-size: 14px;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;

      &:hover {
        background-color: rgba(255, 255, 255, 0.1) !important;
        color: #fff !important;
      }
      
      &.is-active {
        font-weight: 600;
        border-radius: 6px;
        background: linear-gradient(90deg, #1890ff, #0c60b3) !important;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        color: #fff !important;
        
        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          width: 3px;
          height: 100%;
          background-color: #fff;
          border-radius: 3px 0 0 3px;
        }
      }
    }
  }
  
  // 优化弹出菜单的箭头样式
  .el-sub-menu__icon-arrow {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    transition: transform 0.3s ease;
    margin-right: 5px;
  }
  
  // 添加菜单层级标记
  // 一级菜单弹出
  .menu-level-1 {
    position: relative;
    z-index: 10; // 确保层级正确
    
    .el-menu {
      border-left: 3px solid #1890ff;
    }
  }
  
  // 二级菜单弹出
  .menu-level-2 {
    position: relative;
    z-index: 9; // 递减z-index
    
    .el-menu {
      border-left: 3px solid #52c41a;
    }
  }
  
  // 三级菜单弹出
  .menu-level-3 {
    position: relative;
    z-index: 8; // 递减z-index
    
    .el-menu {
      border-left: 3px solid #fa8c16;
    }
  }
  
  // 四级及更深层级菜单弹出
  .menu-level-4,
  [class*="menu-level-"]:not(.menu-level-1):not(.menu-level-2):not(.menu-level-3) {
    position: relative;
    z-index: 7; // 递减z-index
    
    .el-menu {
      border-left: 3px solid #eb2f96;
    }
  }
}

// 专门处理折叠状态下的弹出菜单
body .el-menu--vertical {
  // 弹出菜单容器
  .el-menu.el-menu--popup {
    padding: 5px !important;
    min-width: 200px;
    background-color: #0c2238 !important;
    border: none !important;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.3) !important;
    overflow: hidden !important;
    
    // 添加不同层级菜单的边框样式
    &.menu-level-1-popper {
      border-left: 3px solid #1890ff;
    }
    
    &.menu-level-2-popper {
      border-left: 3px solid #52c41a;
    }
    
    &.menu-level-3-popper {
      border-left: 3px solid #fa8c16;
    }
    
    &.menu-level-4-popper,
    &[class*="menu-level-"]:not(.menu-level-1-popper):not(.menu-level-2-popper):not(.menu-level-3-popper) {
      border-left: 3px solid #eb2f96;
    }
    
    // 调整菜单项样式
    .el-menu-item {
      margin: 4px 0;
      height: 40px;
      line-height: 40px;
      padding: 0 15px 0 40px !important;  // 更合理的缩进
      font-size: 14px;
      border-radius: 4px;
      position: relative;
      
      &::before {
        content: '';
        position: absolute;
        left: 20px;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.4);
      }
      
      &.is-active {
        background: linear-gradient(90deg, #1890ff, #0c60b3) !important;
        color: white !important;
        font-weight: 600;
        
        &::before {
          background-color: white;
          width: 5px;
          height: 5px;
        }
      }
    }
    
    // 调整子菜单标题样式
    .el-sub-menu__title {
      margin: 4px 0;
      height: 40px !important;
      line-height: 40px !important;
      padding: 0 15px 0 40px !important;
      font-size: 14px;
      border-radius: 4px;
      position: relative;
      
      &::before {
        content: '';
        position: absolute;
        left: 20px;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.4);
      }
    }
    
    // 二级弹出菜单容器
    .el-menu {
      background-color: #15304d !important;
      margin: 5px 0;
      padding: 5px 0;
      border-radius: 4px;
      
      .el-menu-item {
        padding-left: 50px !important;
        height: 38px;
        line-height: 38px;
        font-size: 13px;
        
        &::before {
          left: 30px;
        }
      }
      
      .el-sub-menu__title {
        padding-left: 50px !important;
        height: 38px !important;
        line-height: 38px !important;
        font-size: 13px;
        
        &::before {
          left: 30px;
        }
      }
      
      // 三级弹出菜单容器
      .el-menu {
        background-color: #031930 !important;
        
        .el-menu-item {
          padding-left: 60px !important;
          height: 36px;
          line-height: 36px;
          font-size: 12px;
          
          &::before {
            left: 40px;
            width: 3px;
            height: 3px;
          }
        }
        
        .el-sub-menu__title {
          padding-left: 60px !important;
          height: 36px !important;
          line-height: 36px !important;
          font-size: 12px;
          
          &::before {
            left: 40px;
            width: 3px;
            height: 3px;
          }
        }
        
        // 四级弹出菜单容器
        .el-menu {
          background-color: #001529 !important;
          
          .el-menu-item {
            padding-left: 70px !important;
            
            &::before {
              left: 50px;
              width: 2px;
              height: 2px;
            }
          }
          
          .el-sub-menu__title {
            padding-left: 70px !important;
            
            &::before {
              left: 50px;
              width: 2px;
              height: 2px;
            }
          }
        }
      }
    }
  }
}

// 避免弹出菜单中出现不必要的白色边框和边缘
.el-menu.el-menu--popup {
  border: none !important;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.3) !important;
  margin: 0 !important;
  padding: 5px !important;
  
  // 移除弹出菜单中的白色三角标和边框
  &.el-popper[role="tooltip"] {
    &::before, &::after {
      display: none !important;
    }
  }
}

// 修复所有弹出菜单容器的边距问题
.el-popper.el-menu, 
.el-menu--popup.el-popper {
  margin: 0 !important;
  padding: 5px !important;
  box-sizing: border-box !important;
  border: none !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  
  // 移除弹出箭头和所有可能的边框
  .el-popper__arrow {
    display: none !important;
  }
}

// 修复弹出菜单的层叠样式
.el-menu--vertical {
  .el-menu--popup {
    padding: 5px !important;
    margin: 0 !important;
    background-color: #0c2238 !important;
    border: none !important;
    
    .el-menu {
      margin: 5px 0 !important;
      padding: 5px !important;
      background-color: #15304d !important;
      border-radius: 4px !important;
      border: none !important;
      
      .el-menu {
        background-color: #031930 !important;
        margin: 5px 0 !important;
        padding: 5px !important;
        border: none !important;
      }
    }
  }
}

// 重置Element Plus的默认弹出菜单样式
body .el-popper.is-pure, 
body .el-popper.is-light {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  
  &::before, &::after {
    display: none !important;
  }
}

// 设置弹出菜单的内容容器样式
body .el-popper .el-popper__content {
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0 !important;
  
  .el-menu--popup {
    margin: 0 !important;
    padding: 5px !important;
    min-width: 200px;
    background-color: #0c2238 !important;
    border: none !important;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.3) !important;
  }
}

// 修复层级菜单的位置 - 增强对深层菜单的支持
.el-popper.is-pure {
  border: none !important;
  z-index: 2100 !important; // 确保弹出菜单始终显示在顶层
  
  .el-popper__arrow {
    display: none !important;
  }
}

// 为不同级别的菜单设置不同的z-index，确保正确的层叠顺序
.el-menu--popup-container {
  &[data-level="1"] { z-index: 2110 !important; }
  &[data-level="2"] { z-index: 2120 !important; }
  &[data-level="3"] { z-index: 2130 !important; }
  &[data-level="4"] { z-index: 2140 !important; }
  &[data-level="5"] { z-index: 2150 !important; }
  &[data-level="6"] { z-index: 2160 !important; }
  &[data-level="7"] { z-index: 2170 !important; }
  &[data-level="8"] { z-index: 2180 !important; }
  // 理论上支持到8级菜单，实际可扩展
  
  // 修复内容显示不全问题
  max-height: calc(100vh - 50px) !important; 
  overflow: visible !important; // 允许子菜单溢出父容器
}

// 全局重置所有菜单项以确保不受影响
.el-menu--vertical .el-menu-item,
.el-menu--vertical .el-sub-menu__title {
  padding: 0 20px !important;
  text-overflow: ellipsis !important;
  overflow: hidden !important;
  white-space: nowrap !important;
}

// 确保子菜单弹出位置正确
.el-menu--collapse .el-sub-menu > .el-menu {
  position: absolute !important;
  top: 0 !important;
  left: 100% !important;
  margin-left: 5px !important;
}

// 修复层级菜单的位置 - 移除旧的固定位置，使用相对定位
.el-popper.level-1-popper.has-active-child,
.el-popper.level-2-popper.has-active-child,
.el-popper.level-3-popper.has-active-child {
  position: absolute !important;
  margin: 0 !important;
  transform: none !important;
  // 移除固定left值，使用弹性定位
}

// 优化嵌套菜单的样式和过渡效果
.el-menu--vertical .el-menu--popup {
  transform-origin: left top !important;
  transition: transform 0.25s ease, opacity 0.25s ease !important;
}

// 处理深层嵌套菜单的样式
.el-menu--popup .el-menu--popup {
  margin-left: 5px !important; // 保持统一的左侧间距
  position: absolute !important;
  top: 0 !important;
  left: 100% !important;
  max-height: none !important; // 允许子菜单自适应高度
  
  // 确保子菜单不会超出屏幕
  &.el-menu--popup-right-side {
    left: auto !important;
    right: 100% !important;
    margin-right: 5px !important;
    margin-left: 0 !important;
  }
}

// 处理折叠状态下的弹出菜单
body .el-menu--popup {
  background-color: #0c2238 !important;
  border: none !important;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.3) !important;
  
  // 设置子菜单项的样式
  .el-menu-item {
    padding-left: 20px !important;
    margin: 4px;
    height: 40px;
    line-height: 40px;
    color: rgba(255, 255, 255, 0.8);
    
    // 小圆点指示
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.5);
    }
    
    &.is-active {
      background: linear-gradient(90deg, #1890ff, #0c60b3) !important;
      color: white !important;
      
      &::before {
        background-color: white;
      }
    }
  }
}

// 添加修复以适应长菜单的显示问题
.el-menu--vertical {
  .el-menu--popup-container {
    max-height: 90vh !important; // 增加最大高度
    padding: 0 !important;
    
    .el-menu--popup {
      max-height: 80vh !important; // 增加菜单最大高度
      padding: 5px 5px 15px 5px !important; // 底部增加空间防止最后一项被截断
    }
  }
}

// 确保菜单项不缩小，能完整显示文字
.el-menu-item,
.el-sub-menu__title {

  min-height: 40px !important;
}

// 确保子菜单不超出视口底部
.el-menu--vertical[data-placement="bottom"] {
  margin-top: 5px !important;
}

.el-menu--vertical[data-placement="top"] {
  margin-bottom: 5px !important;
}

// 修改弹出菜单中的菜单项样式，确保不被截断
.el-menu--popup .el-menu-item {
  min-width: 160px !important; // 确保最小宽度
  text-overflow: ellipsis !important;
  overflow: hidden !important;
  white-space: nowrap !important;
  display: block !important;
  border-radius: 4px !important;
  margin: 5px 0 !important;
}

// 添加媒体查询，优化小屏幕设备上的显示
@media screen and (max-width: 768px) {
  .#{$prefix-cls}--vertical,
  .#{$prefix-cls}--horizontal {
    .el-menu {
      max-height: calc(100vh - 80px); // 小屏幕设备上减少最大高度
      min-width: 180px; // 小屏幕设备上减少最小宽度
      
      .el-menu-item {
        height: 38px; // 减小高度
        line-height: 38px;
        margin: 2px 4px; // 减小边距
        font-size: 13px; // 减小字体
      }
      
      // 减小子菜单层级的缩进
      .el-menu {
        .el-sub-menu__title,
        .el-menu-item {
          padding-left: 40px !important;
        }
        
        .el-menu {
          .el-sub-menu__title,
          .el-menu-item {
            padding-left: 50px !important;
          }
          
          .el-menu {
            .el-sub-menu__title,
            .el-menu-item {
              padding-left: 60px !important;
            }
          }
        }
      }
    }
  }
}

// 通过覆盖Element Plus的所有可能产生白边的样式
:deep(.el-menu--popup) {
  border: none !important;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.3) !important;
  background-color: #0c2238 !important;
  padding: 5px !important;
  margin: 0 !important;
}

:deep(.el-menu--popup .el-menu) {
  border: none !important;
  background-color: #15304d !important;
  padding: 5px !important;
  margin: 5px 0 !important;
  
  .el-menu {
    border: none !important;
    background-color: #031930 !important;
    padding: 5px !important;
    margin: 5px 0 !important;
    
    .el-menu {
      border: none !important;
      background-color: #001529 !important;
      padding: 5px !important;
      margin: 5px 0 !important;
    }
  }
}

// 直接覆盖Element Plus的基础组件样式
:deep(.el-popper) {
  border: none !important;
  padding: 0 !important;
  margin: 0 !important;
  background: transparent !important;
  
  &::before, &::after {
    display: none !important;
  }
}

:deep(.el-popper__content) {
  border: none !important;
  padding: 0 !important;
  margin: 0 !important;
  background: transparent !important;
  
  &::before, &::after {
    display: none !important;
  }
}

// 完全覆盖EL下拉菜单的样式 - 强制移除白边
body .el-menu--vertical .el-menu--popup.el-popper .el-popper__content {
  all: unset !important;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  box-shadow: none !important;
  overflow: hidden !important;
}

// 添加嵌套层次的样式 - 每个层次都有单独的样式
body .el-menu--popup.el-menu.level-1-menu {
  border-left: 3px solid #1890ff !important;
}

body .el-menu--popup.el-menu.level-2-menu {
  border-left: 3px solid #0c60b3 !important;
}

body .el-menu--popup.el-menu.level-3-menu {
  border-left: 3px solid #004e92 !important;
}

// 全局设置解决深层菜单问题
:root {
  --el-overlay-color-lighter: transparent !important;
  --el-border-color-light: transparent !important;
  --el-border-color: transparent !important;
  --el-border-color-hover: transparent !important;
  --el-popup-border-color: transparent !important;
  --el-menu-border-color: transparent !important;
}

// 彻底解决每个弹出菜单的边框问题
.el-menu,
.el-menu--popup,
.el-popper,
.el-popper__content,
.el-menu--vertical .el-menu--popup,
.el-menu--horizontal .el-menu--popup {
  border: none !important;
  --el-border-width: 0 !important;
  
  &::before, &::after {
    display: none !important;
    content: none !important;
  }
}

// 解决el-popper边框和箭头问题
.el-popper.is-pure {
  border: none !important;
  
  .el-popper__arrow {
    display: none !important;
  }
}

// 确保任何嵌套级别的菜单弹出层都没有边框
.el-menu--popup,
.el-menu--popup .el-menu--popup,
.el-menu--popup .el-menu--popup .el-menu--popup,
.el-menu--popup .el-menu--popup .el-menu--popup .el-menu--popup {
  border: none !important;
  background-color: #0c2238 !important;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.3) !important;
}

// 针对特定嵌套级别的弹出菜单样式重置
[class*="el-popper"][class*="level"] {
  border: none !important;
  box-shadow: none !important;
  
  &::before, &::after, .el-popper__arrow {
    display: none !important;
  }
  
  .el-popper__content {
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
    
    &::before, &::after {
      display: none !important;
    }
    
    .el-menu--popup {
      border: none !important;
      background-color: #0c2238 !important;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.3) !important;
    }
  }
}

// 专门为折叠状态下的菜单项设置样式，不影响展开状态
body .#{$prefix-cls} .#{$elNamespace}-menu--collapse > .is-active,
body .#{$prefix-cls} .#{$elNamespace}-menu--collapse > .is-active > .#{$elNamespace}-sub-menu__title,
body .#{$prefix-cls} .#{$elNamespace}-menu--collapse > [data-active="true"],
body .#{$prefix-cls} .#{$elNamespace}-menu--collapse > [data-active="true"] > .#{$elNamespace}-sub-menu__title {
  position: relative !important;
  background: #1278da;
  border-radius: 6px !important;

  color: white !important;
  z-index: 10 !important;
  
  &::before {
    content: '' !important;
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 3px !important;
    height: 100% !important;
    background-color: #fff !important;
    border-radius: 3px 0 0 3px !important;
  }
  
  .menu-icon-wrapper .menu-icon {
    color: white !important;
  }
}

// 移除在折叠状态下因子菜单激活而应用到父菜单的样式
body .#{$prefix-cls} .#{$elNamespace}-menu--collapse > [data-has-active-child="true"]:not([data-active="true"]),
body .#{$prefix-cls} .#{$elNamespace}-menu--collapse > [data-has-active-child="true"]:not([data-active="true"]) > .#{$elNamespace}-sub-menu__title {
  background: transparent !important;  // 恢复默认背景
  color: var(--left-menu-text-color) !important;  // 恢复默认文字颜色
  
  &::before {
    display: none !important;  // 移除白色指示条
  }
  
  .menu-icon-wrapper .menu-icon {
    color: inherit !important;  // 恢复默认图标颜色
  }
}

// 为每个层级的菜单添加特定样式
body .#{$prefix-cls} .#{$elNamespace}-menu--collapse {
  .menu-item-level-1,
  .menu-item-level-2,
  .menu-item-level-3,
  .menu-item-level-4,
  [class*="menu-item-level-"] {
    &.el-menu-collapse-active,
    &.is-active,
    &[data-active="true"] {
      background: linear-gradient(90deg, #1890ff, #0c60b3) !important;
      border-radius: 6px !important;
      margin: 6px 8px !important;
      color: white !important;
      
      &::before {
        content: '' !important;
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 3px !important;
        height: 100% !important;
        background-color: #fff !important;
        border-radius: 3px 0 0 3px !important;
      }
    }
    
    // 确保有激活子菜单但自身未激活的菜单项不显示激活样式
    &[data-has-active-child="true"]:not([data-active="true"]) {
      background: transparent !important;
      color: var(--left-menu-text-color) !important;
      
      &::before {
        display: none !important;
      }
    }
  }
}

// 确保子菜单被激活时父菜单不显示激活样式
body .#{$prefix-cls} .#{$elNamespace}-menu--collapse {
  // 移除之前级联激活到父菜单的样式
  .#{$elNamespace}-sub-menu:has([data-active="true"]):not([data-active="true"]),
  .#{$elNamespace}-menu-item-group:has([data-active="true"]):not([data-active="true"]) {
    background: transparent !important;
    border-radius: 6px !important;
    
    > .#{$elNamespace}-sub-menu__title {
      color: var(--left-menu-text-color) !important;
    }
  }
}

// 在折叠状态下禁用一些可能导致样式冲突的其他规则
body .#{$elNamespace}-menu--collapse {
  .is-active.el-menu-item:hover, 
  .is-active > .#{$elNamespace}-sub-menu__title:hover,
  .#{$elNamespace}-menu-item.is-active:hover,
  .#{$elNamespace}-sub-menu.is-active > .#{$elNamespace}-sub-menu__title:hover,
  [data-active="true"]:hover,
  [data-active="true"] > .#{$elNamespace}-sub-menu__title:hover,
  [data-has-active-child="true"]:hover,
  [data-has-active-child="true"] > .#{$elNamespace}-sub-menu__title:hover {
    background: linear-gradient(90deg, #1890ff, #0c60b3) !important;
    transform: none !important; // 禁用悬停时的位移，避免与激活状态冲突
  }
}

// 最终全局重置所有可能带有边框的元素
body .el-menu--vertical,
body .el-menu--horizontal,
body .el-menu--popup-container,
body .el-menu-item-group__title {
  &, * {
    border: none !important;
  }
}

// 折叠状态下的弹出菜单优化
.el-menu--vertical .el-menu--popup[data-level] {
  // 设置层级特定的阴影颜色，增强层次感
  &[data-level="1"] { box-shadow: 0 4px 16px rgba(24, 144, 255, 0.15) !important; }
  &[data-level="2"] { box-shadow: 0 4px 16px rgba(12, 96, 179, 0.15) !important; }
  &[data-level="3"] { box-shadow: 0 4px 16px rgba(82, 196, 26, 0.15) !important; }
  &[data-level="4"] { box-shadow: 0 4px 16px rgba(250, 140, 22, 0.15) !important; }
  &[data-level="5"] { box-shadow: 0 4px 16px rgba(235, 47, 150, 0.15) !important; }
  &[data-level="6"] { box-shadow: 0 4px 16px rgba(114, 46, 209, 0.15) !important; }
  &[data-level="7"] { box-shadow: 0 4px 16px rgba(245, 34, 45, 0.15) !important; }
  &[data-level="8"] { box-shadow: 0 4px 16px rgba(19, 194, 194, 0.15) !important; }
  
  // 添加不同层级的标识图标
  &::after {
    content: '';
    display: block !important;
    position: absolute;
    right: 10px;
    top: 10px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    opacity: 0.7;
    
    // 不同层级的标识图标颜色
    &[data-level="1"]::after { background-color: #1890ff; }
    &[data-level="2"]::after { background-color: #0c60b3; }
    &[data-level="3"]::after { background-color: #52c41a; }
    &[data-level="4"]::after { background-color: #fa8c16; }
    &[data-level="5"]::after { background-color: #eb2f96; }
    &[data-level="6"]::after { background-color: #722ed1; }
    &[data-level="7"]::after { background-color: #f5222d; }
    &[data-level="8"]::after { background-color: #13c2c2; }
  }
  
  // 为深层级菜单添加条纹背景，增强区分度
  &[data-level="3"],
  &[data-level="4"],
  &[data-level="5"],
  &[data-level="6"],
  &[data-level="7"],
  &[data-level="8"] {
    background-image: linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.03) 25%,
      transparent 25%,
      transparent 50%,
      rgba(255, 255, 255, 0.03) 50%,
      rgba(255, 255, 255, 0.03) 75%,
      transparent 75%,
      transparent
    ) !important;
    background-size: 10px 10px !important;
  }
}

// 添加动画效果
.el-menu--popup {
  transition: transform 0.2s, opacity 0.2s !important;
  transform-origin: left top !important;
  
  // 反向弹出时的变换原点调整
  &.el-menu--popup-right-side {
    transform-origin: right top !important;
  }
}

// 折叠状态下菜单展开/收起的过渡动画优化
.el-menu--collapse-transition {
  transition: width 0.3s ease, opacity 0.3s ease, transform 0.3s ease !important;
}
</style>

<!-- 补充样式，修复折叠菜单显示不全问题 -->
<style lang="scss">
// 以下是额外添加的样式，用于解决菜单显示不全问题
.el-menu--vertical {
  .el-menu--popup {
    max-height: 80vh !important; // 限制菜单高度但保持足够空间
    overflow-y: auto !important; // 开启垂直滚动
    overflow-x: hidden !important; 
    min-width: 200px !important; // 增加最小宽度，确保能容纳子菜单
    
    // 美化滚动条
    &::-webkit-scrollbar {
      width: 6px !important;
      background-color: rgba(0, 0, 0, 0.1) !important;
    }
    
    &::-webkit-scrollbar-thumb {
      background-color: rgba(255, 255, 255, 0.3) !important;
      border-radius: 3px !important;
    }
    
    // 确保菜单项文字不被截断
    .el-menu-item {
      padding-right: 15px !important; // 为滚动条留出空间
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      box-sizing: border-box !important;
      min-width: 180px !important; // 确保最小宽度
      width: 100% !important;
      margin: 3px 0 !important;
    }
    
    // 处理子菜单标题
    .el-sub-menu__title {
      padding-right: 15px !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      box-sizing: border-box !important;
      width: 100% !important;
    }
    
    // 子菜单特别处理 - 确保有足够宽度显示孙子级菜单
    .el-sub-menu {
      width: 100% !important;
      position: relative !important;
      
      & > .el-sub-menu__title {
        padding-right: 30px !important; // 为箭头留出空间
        position: relative !important;
      }
    }
  }
  
  // 处理子菜单容器
  .el-menu--popup-container {
    padding: 0 !important;
    overflow: visible !important; // 让子菜单可以溢出父容器
    
    // 确保弹出菜单定位正确
    .el-menu {
      position: relative !important;
    }
  }
}

// 修复菜单弹出层位置问题
.el-menu--collapse {
  .el-sub-menu {
    & > .el-menu {
      position: absolute !important;
      margin-left: 5px !important;
      top: 0 !important;
      left: 100% !important;
      border-radius: 4px !important;
      min-width: 180px !important;
    }
  }
}

// 确保菜单层级正确显示
.el-menu--popup[data-level] {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3) !important;
  z-index: 2100 !important; // 确保层级足够高
}

// 解决菜单底部项目被截断问题
.el-menu--popup {
  padding-bottom: 10px !important; // 底部增加内边距
  
  // 最后一个菜单项增加底部边距
  & > .el-menu-item:last-child,
  & > .el-sub-menu:last-child {
    margin-bottom: 5px !important;
  }
}

// 处理深层嵌套菜单
.el-menu--popup .el-menu--popup {
  // 调整深层菜单位置，防止超出屏幕
  &.el-menu--popup-bottom {
    top: auto !important;
    bottom: 0 !important;
  }
  
  &.el-menu--popup-right {
    left: auto !important;
    right: 0 !important;
  }
}

// 提高子菜单选项可见性
.el-menu--vertical .el-menu--popup .el-menu--popup {
  min-width: 180px !important;
  background-color: #031930 !important; // 深层菜单使用更深的背景色
  border-left: 2px solid #1890ff !important; // 添加边框以增强区分度
}

// 修复子菜单宽度问题 - 确保父菜单有足够宽度
body .el-menu--vertical {
  // 保证二级菜单(第一级弹出菜单)宽度足够
  & > .el-menu--popup-container > .el-menu--popup {
    min-width: 200px !important;
    
    // 设置二级菜单中的子菜单项
    & > .el-sub-menu {
      position: static !important; // 保持正常文档流
      width: 100% !important;
      
      // 确保子菜单标题右侧有足够空间显示箭头
      & > .el-sub-menu__title {
        padding-right: 30px !important;
        position: relative !important;
      }
    }
  }
  
  // 确保弹出式子菜单正确定位
  .el-menu--popup .el-sub-menu > .el-menu--popup {
    position: absolute !important;
    left: calc(100% - 5px) !important; // 适当偏移，让子菜单与父菜单有一定重叠
    top: 0 !important;
    margin-left: 0 !important;
  }
}

// 添加检测式样式，强制显示所有层级的菜单
.el-menu--popup-container {
  .el-menu--popup {
    visibility: visible !important;
    opacity: 1 !important;
    transform: none !important;
    
    // 确保所有子菜单都能正确显示
    .el-sub-menu.is-opened > .el-menu--popup {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      transform: none !important;
    }
  }
}

// 强制菜单可见性
.el-menu--popup {
  display: block !important;
  
  // 确保子菜单项足够宽
  .el-sub-menu {
    width: 100% !important;
    
    // 对所有子菜单标题添加指示器
    & > .el-sub-menu__title {
      padding-right: 30px !important;
      
      // 利用已有的箭头图标，调整其位置和样式
      .el-sub-menu__icon-arrow {
        position: absolute !important;
        right: 15px !important;
        color: rgba(255, 255, 255, 0.7) !important;
        font-size: 12px !important;
        margin-top: -6px !important;
      }
    }
  }
}

// 处理子菜单弹出时的位置和样式
.el-menu--popup .el-sub-menu.is-opened {
  position: relative !important;
  
  & > .el-menu--popup {
    position: absolute !important;
    left: 100% !important;
    top: 0 !important;
    min-width: 180px !important;
    margin: 0 !important;
    padding: 5px !important;
    background-color: #031930 !important;
    border-radius: 4px !important;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3) !important;
    z-index: 2001 !important;
  }
}
</style>

<!-- 新增样式，专门处理折叠状态下的子菜单显示问题 -->
<style lang="scss">
// 修复折叠状态下的菜单显示问题，特别是孙子级菜单的显示
body {
  // 基础设置：确保所有子菜单可见
  .el-menu--vertical {
    .el-menu--popup {
      min-width: 200px !important; // 增加宽度
      
      // 二级菜单项
      .el-sub-menu {
        position: relative !important;
        
        // 二级菜单项标题
        .el-sub-menu__title {
          position: relative !important;
          padding-right: 30px !important; // 为箭头留出空间
        }
        
        // 三级菜单(孙子级)
        .el-menu--popup {
          position: absolute !important;
          left: 100% !important;
          top: 0 !important;
          min-width: 200px !important;
          background-color: #031930 !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important;
          z-index: 2002 !important; // 确保在父菜单之上
          
          // 三级菜单项
          .el-menu-item {
            padding-left: 20px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
        }
        
        // 已打开的子菜单
        &.is-opened {
          & > .el-menu--popup {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
        }
      }
    }
  }
  
  // Element Plus的菜单箭头修复
  .el-sub-menu__icon-arrow {
    transition: transform 0.3s !important;
  }
  
  // 确保已打开子菜单的箭头旋转正确
  .el-sub-menu.is-opened > .el-sub-menu__title .el-sub-menu__icon-arrow {
    transform: rotateZ(180deg) !important;
  }
  
  // 处理多级子菜单的层叠样式
  .el-menu--vertical .el-menu--popup .el-menu--popup {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important;
    border-radius: 8px !important;
    padding: 5px !important;
    border-left: 2px solid #1890ff !important;
    
    .el-menu--popup {
      border-left: 2px solid #52c41a !important; // 第四级使用另一种颜色边框
      background-color: #001529 !important; // 更深的背景色
    }
  }
  
  // 覆盖Element Plus的原生菜单样式，确保子菜单正确显示
  .el-menu--collapse .el-sub-menu.is-opened .el-menu--popup {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
  
  // 处理菜单项的hover效果
  .el-menu--popup .el-menu-item:hover,
  .el-menu--popup .el-sub-menu__title:hover {
    background-color: rgba(255, 255, 255, 0.1) !important;
  }
  
  // 处理激活菜单项的样式
  .el-menu--popup .el-menu-item.is-active {
    background: linear-gradient(90deg, #1890ff, #0c60b3) !important;
    color: white !important;
  }
}
</style>

<!-- 添加新样式，彻底解决菜单弹出问题 -->
<style lang="scss">
// 确保所有弹出菜单都是独立的，不受父级宽度限制
body {
  // 关键修复：将所有弹出菜单放到body下，而不是嵌套在父菜单中
  .el-menu--popup-container {
    position: fixed !important; // 使用fixed定位，脱离文档流
    z-index: 3000 !important; // 使用很高的z-index确保显示在最上层
    
    .el-menu--popup {
      position: static !important; // 菜单本身使用静态定位
      min-width: 220px !important; // 增加宽度，确保内容完整显示
      box-sizing: border-box !important;
    }
  }
  
  // 确保所有层级的弹出菜单都有足够的宽度和正确的样式
  .el-menu--vertical .el-menu--popup,
  .el-menu--popup .el-menu--popup,
  .el-menu--popup .el-menu--popup .el-menu--popup {
    min-width: 220px !important; // 统一增加宽度
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important; 
    border-radius: 8px !important;
    overflow: visible !important; // 允许子菜单溢出
  }
  
  // 修复嵌套菜单的定位
  .el-menu--popup .el-sub-menu.is-opened > .el-menu--popup {
    position: fixed !important; // 使用fixed定位，完全脱离文档流
    left: auto !important; // 不使用left值，通过transform定位
    top: auto !important; // 不使用top值，通过transform定位
    transform: translate(100%, 0) !important; // 相对于父菜单定位
    margin-left: 5px !important; // 添加间距
    transform-origin: left top !important; // 设置变换原点
  }
  
  // 专门处理深层菜单的样式
  .el-menu--popup[data-level="2"],
  .el-menu--popup[data-level="3"],
  .el-menu--popup[data-level="4"],
  .el-menu--popup[data-level="5"] {
    min-width: 220px !important; // 增加宽度
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5) !important; // 增强阴影
  }
  
  // 确保菜单项内容不被截断
  .el-menu--popup .el-menu-item,
  .el-menu--popup .el-sub-menu__title {
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    padding: 0 20px !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
  
  // 解决菜单项样式冲突
  .el-menu--popup .el-menu-item {
    min-height: 40px !important;
    line-height: 40px !important;
    margin: 4px 0 !important;
    border-radius: 4px !important;
  }
}
</style>

