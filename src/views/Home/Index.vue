<template>
  <div class="home-dashboard fade-in">
    <!-- 欢迎面板 -->
    <el-card 
      shadow="hover" 
      class="welcome-card card-hover" 
      :body-style="{ padding: 'var(--card-padding)' }"
    >
      <el-skeleton :loading="loading" animated>
        <el-row :gutter="16" justify="space-between">
          <el-col :xl="12" :lg="12" :md="12" :sm="24" :xs="24">
            <div class="flex items-center">
              <div class="welcome-avatar-container mr-20px">
                <el-avatar :src="avatar" :size="80" class="welcome-avatar">
                  <img src="@/assets/imgs/avatar.gif" alt="" />
                </el-avatar>
                <div class="welcome-avatar-badge"></div>
              </div>
              <div class="welcome-text">
                <div class="text-24px font-bold mb-10px gradient-text">
                  {{ t('workplace.welcome') }} {{ username }} {{ t('workplace.happyDay') }}
                </div>
                <div class="text-16px text-gray-500 flex items-center">
                  <i class="el-icon-sunny mr-8px"></i>
                  {{ t('workplace.toady') }}，20℃ - 32℃！
                </div>
              </div>
            </div>
          </el-col>
          <el-col :xl="12" :lg="12" :md="12" :sm="24" :xs="24">
            <div class="h-80px flex items-center justify-end lt-sm:mt-16px">
              <div class="stat-item">
                <div class="stat-title">{{ t('workplace.project') }}</div>
                <CountTo
                  class="stat-value"
                  :start-val="0"
                  :end-val="totalSate.project"
                  :duration="2600"
                />
              </div>
              <el-divider direction="vertical" class="stat-divider" />
              <div class="stat-item">
                <div class="stat-title">{{ t('workplace.toDo') }}</div>
                <CountTo
                  class="stat-value"
                  :start-val="0"
                  :end-val="totalSate.todo"
                  :duration="2600"
                />
              </div>
              <el-divider direction="vertical" border-style="dashed" class="stat-divider" />
              <div class="stat-item">
                <div class="stat-title">{{ t('workplace.access') }}</div>
                <CountTo
                  class="stat-value pulse"
                  :start-val="0"
                  :end-val="totalSate.access"
                  :duration="2600"
                />
              </div>
            </div>
          </el-col>
        </el-row>
      </el-skeleton>
    </el-card>

    <el-row class="mt-16px" :gutter="16" justify="space-between">
      <!-- 项目列表 -->
      <el-col :xl="16" :lg="16" :md="24" :sm="24" :xs="24" class="mb-16px">
        <el-card 
          shadow="hover" 
          class="project-card card-hover" 
          :body-style="{ padding: '0' }"
        >
          <template #header>
            <div class="card-header">
              <span class="card-title">{{ t('workplace.project') }}</span>
            </div>
          </template>
          <el-skeleton :loading="loading" animated>
            <div class="project-grid">
              <div
                v-for="(item, index) in projects"
                :key="`card-${index}`"
                class="project-item stagger-item scale-in"
              >
                <el-card shadow="never" class="inner-card">
                  <div class="project-icon-container">
                    <Icon :icon="item.icon" :size="32" />
                  </div>
                  <div class="project-name">{{ item.name }}</div>
                  <div class="project-desc">{{ t(item.message) }}</div>
                  <div class="project-meta">
                    <span class="project-author">{{ item.personal }}</span>
                    <span class="project-date">{{ formatTime(item.time, 'yyyy-MM-dd') }}</span>
                  </div>
                </el-card>
              </div>
            </div>
          </el-skeleton>
        </el-card>

        <!-- 图表卡片 -->


<!--        <el-card
          shadow="hover" 
          class="chart-card card-hover mt-16px" 
          :body-style="{ padding: 'var(&#45;&#45;card-padding)' }"
        >
          <template #header>
            <div class="card-header">
              <span class="card-title">{{ t('workplace.activityData') }}</span>
              <div class="chart-legend">
                <div class="legend-item">
                  <div class="legend-color" style="background-color: var(&#45;&#45;chart-color-1)"></div>
                  <span>{{ t('analysis.activeQuantity') }}</span>
                </div>
              </div>
            </div>
          </template>
          <el-skeleton :loading="loading" animated>
            <div class="chart-container slide-up-in">
              <Echart :options="barOptionsData" :height="300" />
            </div>
          </el-skeleton>
        </el-card>
     -->



      </el-col>

      <!-- 右侧卡片 -->
      <el-col :xl="8" :lg="8" :md="24" :sm="24" :xs="24" class="mb-16px">
        <!-- 快捷操作 -->
        <el-card 
          shadow="hover" 
          class="shortcut-card card-hover" 
          :body-style="{ padding: 'var(--card-padding)' }"
        >
          <template #header>
            <div class="card-header">
              <span class="card-title">{{ t('workplace.shortcutOperation') }}</span>
            </div>
          </template>
          <el-skeleton :loading="loading" animated>
            <div class="shortcut-grid">
              <div v-for="item in shortcut" :key="`shortcut-${item.name}`" class="shortcut-item stagger-item">
                <div class="shortcut-inner" @click="setWatermark(item.name)">
                  <Icon :icon="item.icon" :size="24" />
                  <span class="shortcut-name">{{ item.name }}</span>
                </div>
              </div>
            </div>
          </el-skeleton>
        </el-card>

        <!-- 通知公告 -->
        <el-card 
          shadow="hover" 
          class="notice-card card-hover mt-16px" 
          :body-style="{ padding: 'var(--card-padding)' }"
        >
          <template #header>
            <div class="card-header">
              <span class="card-title">{{ t('workplace.notice') }}</span>
              <el-link 
                type="primary" 
                :underline="false" 
                class="view-more"
              >
                {{ t('action.more') }}
                <el-icon class="el-icon-right"/>
              </el-link>
            </div>
          </template>
          <el-skeleton :loading="loading" animated>
            <div class="notice-list">
              <div 
                v-for="(item, index) in notice" 
                :key="`dynamics-${index}`" 
                class="notice-item stagger-item slide-up-in"
              >
                <div class="notice-content">
                  <el-avatar :src="avatar" :size="40" class="notice-avatar">
                    <img src="@/assets/imgs/avatar.gif" alt="" />
                  </el-avatar>
                  <div class="notice-info">
                    <div class="notice-title">
                      <Highlight :keys="item.keys.map((v) => t(v))">
                        <span class="notice-type">{{ item.type }}:</span> {{ item.title }}
                      </Highlight>
                    </div>
                    <div class="notice-date">
                      {{ formatTime(item.date, 'yyyy-MM-dd') }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-skeleton>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts" setup>
import { set } from 'lodash-es'
import { EChartsOption } from 'echarts'
import { formatTime } from '@/utils'

import { useUserStore } from '@/store/modules/user'
import { useWatermark } from '@/hooks/web/useWatermark'
import type { WorkplaceTotal, Project, Notice, Shortcut } from './types'
import { barOptions } from './echarts-data'

defineOptions({ name: 'Home' })

const { t } = useI18n()
const userStore = useUserStore()
const { setWatermark } = useWatermark()
const loading = ref(true)
const avatar = userStore.getUser.avatar
const username = userStore.getUser.nickname

// 获取统计数
let totalSate = reactive<WorkplaceTotal>({
  project: 0,
  access: 0,
  todo: 0
})

const getCount = async () => {
  const data = {
    project: 40,
    access: 2340,
    todo: 10
  }
  totalSate = Object.assign(totalSate, data)
}

// 获取项目数
let projects = reactive<Project[]>([])
const getProject = async () => {
  const data = [

  ]
  projects = Object.assign(projects, data)
}

// 获取通知公告
let notice = reactive<Notice[]>([])
const getNotice = async () => {
  const data = [

  ]
  notice = Object.assign(notice, data)
}

// 获取快捷入口
let shortcut = reactive<Shortcut[]>([])

const getShortcut = async () => {
  const data = [

  ]
  shortcut = Object.assign(shortcut, data)
}

const barOptionsData = reactive<EChartsOption>(barOptions) as EChartsOption

// 周活跃量
const getWeeklyUserActivity = async () => {
  const data = [
    { value: 13253, name: 'analysis.monday' },
    { value: 34235, name: 'analysis.tuesday' },
    { value: 26321, name: 'analysis.wednesday' },
    { value: 12340, name: 'analysis.thursday' },
    { value: 24643, name: 'analysis.friday' },
    { value: 1322, name: 'analysis.saturday' },
    { value: 1324, name: 'analysis.sunday' }
  ]
  set(
    barOptionsData,
    'xAxis.data',
    data.map((v) => t(v.name))
  )
  set(barOptionsData, 'series', [
    {
      name: t('analysis.activeQuantity'),
      type: 'bar',
      barWidth: '60%',
      data: data.map((v) => v.value)
    }
  ])
}

onMounted(async () => {
  await getWeeklyUserActivity()
  await getCount()
  await getProject()
  await getNotice()
  await getShortcut()
  loading.value = false
})
</script>

<style lang="scss" scoped>
.home-dashboard {
  .welcome-card {
    border-radius: var(--card-border-radius);
    box-shadow: var(--card-shadow);
    
    .welcome-avatar-container {
      position: relative;
      
      .welcome-avatar {
        border: 3px solid var(--el-color-primary-light-5);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
      }
      
      .welcome-avatar-badge {
        position: absolute;
        bottom: 0;
        right: 3px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-color: #52c41a;
        border: 2px solid white;
      }
    }
    
    .welcome-text {
      .gradient-text {
        background: var(--gradient-primary);
        background-clip: text;
        -webkit-background-clip: text;
        color: transparent;
      }
    }
    
    .stat-item {
      padding: 0 16px;
      text-align: center;
      
      .stat-title {
        font-size: var(--font-size-sm);
        color: var(--el-text-color-secondary);
        margin-bottom: 8px;
      }
      
      .stat-value {
        font-size: var(--font-size-xxl);
        font-weight: bold;
        color: var(--el-color-primary);
      }
    }
    
    .stat-divider {
      height: 40px;
      margin: 0;
    }
  }
  
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--card-header-height);
    padding: 0 var(--card-padding);
    
    .card-title {
      font-size: var(--font-size-lg);
      font-weight: bold;
      color: var(--el-text-color-primary);
    }
    
    .view-more {
      display: flex;
      align-items: center;
      
      .el-icon-right {
        font-size: 12px;
        margin-left: 4px;
      }
    }
  }
  
  .project-card {
    border-radius: var(--card-border-radius);
    box-shadow: var(--card-shadow);
    
    .project-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      padding: 16px;
      
      @media (max-width: 1400px) {
        grid-template-columns: repeat(2, 1fr);
      }
      
      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }
    
    .project-item {
      .inner-card {
        border: 1px solid var(--border-color-light);
        border-radius: var(--border-radius-md);
        transition: all 0.3s;
        height: 100%;
        
        &:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-base);
          border-color: var(--el-color-primary-light-7);
        }
      }
      
      .project-icon-container {
        margin-bottom: 12px;
        color: var(--el-color-primary);
      }
      
      .project-name {
        font-size: var(--font-size-lg);
        font-weight: 500;
        margin-bottom: 8px;
        color: var(--el-text-color-primary);
      }
      
      .project-desc {
        font-size: var(--font-size-sm);
        color: var(--el-text-color-secondary);
        margin-bottom: 16px;
        height: 40px;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      
      .project-meta {
        display: flex;
        justify-content: space-between;
        font-size: var(--font-size-sm);
        color: var(--el-text-color-secondary);
      }
    }
  }
  
  .chart-card {
    border-radius: var(--card-border-radius);
    box-shadow: var(--card-shadow);
    
    .chart-legend {
      display: flex;
      align-items: center;
      
      .legend-item {
        display: flex;
        align-items: center;
        margin-left: 16px;
        
        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          margin-right: 8px;
        }
      }
    }
    
    .chart-container {
      width: 100%;
      height: 100%;
    }
  }
  
  .shortcut-card {
    border-radius: var(--card-border-radius);
    box-shadow: var(--card-shadow);
    
    .shortcut-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      
      @media (max-width: 576px) {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    .shortcut-item {
      .shortcut-inner {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16px;
        border-radius: var(--border-radius-md);
        background-color: var(--el-fill-color-light);
        cursor: pointer;
        transition: all 0.3s;
        
        &:hover {
          background-color: var(--el-color-primary-light-9);
          color: var(--el-color-primary);
          transform: translateY(-3px);
        }
        
        .shortcut-name {
          margin-top: 8px;
          font-size: var(--font-size-sm);
        }
      }
    }
  }
  
  .notice-card {
    border-radius: var(--card-border-radius);
    box-shadow: var(--card-shadow);
    
    .notice-list {
      .notice-item {
        &:not(:last-child) {
          border-bottom: 1px solid var(--border-color-light);
          margin-bottom: 16px;
          padding-bottom: 16px;
        }
        
        .notice-content {
          display: flex;
          align-items: flex-start;
          
          .notice-avatar {
            margin-right: 12px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
          }
          
          .notice-info {
            flex: 1;
            
            .notice-title {
              font-size: var(--font-size-base);
              color: var(--el-text-color-primary);
              margin-bottom: 8px;
              
              .notice-type {
                font-weight: bold;
                color: var(--el-color-primary);
              }
            }
            
            .notice-date {
              font-size: var(--font-size-sm);
              color: var(--el-text-color-secondary);
            }
          }
        }
      }
    }
  }
}
</style>
