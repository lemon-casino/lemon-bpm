<script lang="tsx">
import { computed, defineComponent, unref } from 'vue'
import { useAppStore } from '@/store/modules/app'
import { Backtop } from '@/components/Backtop'

import { useRenderLayout } from './components/useRenderLayout'
import { useDesign } from '@/hooks/web/useDesign'

const { getPrefixCls } = useDesign()

const prefixCls = getPrefixCls('layout')

const appStore = useAppStore()

// 是否是移动端
const mobile = computed(() => appStore.getMobile)

// 菜单折叠
const collapse = computed(() => appStore.getCollapse)

const layout = computed(() => appStore.getLayout)

const handleClickOutside = () => {
  appStore.setCollapse(true)
}

const renderLayout = () => {
  switch (unref(layout)) {
    case 'classic':
      const { renderClassic } = useRenderLayout()
      return renderClassic()
    case 'topLeft':
      const { renderTopLeft } = useRenderLayout()
      return renderTopLeft()
    case 'top':
      const { renderTop } = useRenderLayout()
      return renderTop()
    case 'cutMenu':
      const { renderCutMenu } = useRenderLayout()
      return renderCutMenu()
    default:
      break
  }
}

export default defineComponent({
  name: 'Layout',
  setup() {
    return () => (
      <section class={[prefixCls, `${prefixCls}__${layout.value}`, 'w-[100%] h-[100%] relative transition-all duration-300']}>
        {mobile.value && !collapse.value ? (
          <div
            class="absolute left-0 top-0 z-[var(--z-index-modal-backdrop)] h-full w-full bg-[var(--el-color-black)] opacity-30 backdrop-blur-sm transition-opacity duration-300"
            onClick={handleClickOutside}
          ></div>
        ) : undefined}

        {renderLayout()}

        <Backtop></Backtop>


      </section>
    )
  }
})
</script>

<style lang="scss" scoped>
$prefix-cls: #{$namespace}-layout;

.#{$prefix-cls} {
  background-color: var(--app-content-bg-color);
  transition: all var(--transition-time-base);
  
  &__classic, &__topLeft, &__top, &__cutMenu {
    transition: all var(--transition-time-base);
  }
}

// 自定义滚动条
:deep(.el-scrollbar__bar) {
  z-index: var(--z-index-normal);
  
  &.is-horizontal {
    height: 8px;
  }
  
  &.is-vertical {
    width: 8px;
  }
  
  .el-scrollbar__thumb {
    background-color: rgba(144, 147, 153, 0.3);
    border-radius: 10px;
    
    &:hover {
      background-color: rgba(144, 147, 153, 0.5);
    }
  }
}
</style>
