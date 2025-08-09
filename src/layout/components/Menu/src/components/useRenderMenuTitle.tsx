import type { RouteMeta } from 'vue-router'
import { Icon } from '@/components/Icon'
import { useI18n } from '@/hooks/web/useI18n'
import { useAppStore } from '@/store/modules/app'
import { computed, unref, Fragment } from 'vue'

export const useRenderMenuTitle = () => {
  const renderMenuTitle = (meta: RouteMeta) => {
    const { t } = useI18n()
    const { title = 'Please set title', icon } = meta
    const appStore = useAppStore()
    const collapse = computed(() => appStore.getCollapse)

    return icon ? (
      <Fragment>
        <div class="menu-icon-wrapper">
          <Icon icon={meta.icon} class={`menu-icon ${unref(collapse) ? 'is-collapsed' : ''}`}></Icon>
        </div>
        <span class="v-menu__title overflow-hidden overflow-ellipsis whitespace-nowrap">
          {t(title as string)}
        </span>
      </Fragment>
    ) : (
      <span class="v-menu__title overflow-hidden overflow-ellipsis whitespace-nowrap">
        {t(title as string)}
      </span>
    )
  }

  return {
    renderMenuTitle
  }
}
