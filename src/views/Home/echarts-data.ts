import { EChartsOption } from 'echarts'
import { useI18n } from '@/hooks/web/useI18n'

const { t } = useI18n()

export const lineOptions: EChartsOption = {
  title: {
    text: t('analysis.monthlySales'),
    left: 'center'
  },
  xAxis: {
    data: [
      t('analysis.january'),
      t('analysis.february'),
      t('analysis.march'),
      t('analysis.april'),
      t('analysis.may'),
      t('analysis.june'),
      t('analysis.july'),
      t('analysis.august'),
      t('analysis.september'),
      t('analysis.october'),
      t('analysis.november'),
      t('analysis.december')
    ],
    boundaryGap: false,
    axisTick: {
      show: false
    }
  },
  grid: {
    left: 20,
    right: 20,
    bottom: 20,
    top: 80,
    containLabel: true
  },
  tooltip: {
    trigger: 'axis',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    textStyle: {
      color: '#333'
    },
    axisPointer: {
      type: 'cross',
      label: {
        backgroundColor: 'var(--el-color-primary)'
      }
    }
  },
  yAxis: {
    axisTick: {
      show: false
    },
    splitLine: {
      lineStyle: {
        type: 'dashed',
        color: '#eaeaea'
      }
    },
    axisLabel: {
      color: '#666',
      fontSize: 12,
      formatter: function (value: number) {
        if (value >= 1000) {
          return (value / 1000).toFixed(0) + 'k'
        }
        return value.toString()
      }
    }
  },
  legend: {
    data: [t('analysis.estimate'), t('analysis.actual')],
    top: 50
  },
  series: [
    {
      name: t('analysis.estimate'),
      smooth: true,
      type: 'line',
      data: [100, 120, 161, 134, 105, 160, 165, 114, 163, 185, 118, 123],
      animationDuration: 2800,
      animationEasing: 'cubicInOut',
      lineStyle: {
        width: 3,
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowBlur: 10,
        shadowOffsetY: 5,
        cap: 'round'
      },
      itemStyle: {
        color: 'var(--el-color-primary)',
        borderWidth: 2
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(100, 149, 237, 0.3)' },
            { offset: 1, color: 'rgba(100, 149, 237, 0.05)' }
          ]
        }
      },
      emphasis: {
        scale: true
      }
    },
    {
      name: t('analysis.actual'),
      smooth: true,
      type: 'line',
      itemStyle: {},
      data: [120, 82, 91, 154, 162, 140, 145, 250, 134, 56, 99, 123],
      animationDuration: 2800,
      animationEasing: 'quadraticOut'
    }
  ]
}

export const barOptions: EChartsOption = {
  title: {
    text: t('analysis.weeklyUserActivity'),
    left: 'center'
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    },
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    textStyle: {
      color: '#333'
    },
    confine: true
  },
  grid: {
    left: '2%',
    right: '2%',
    bottom: '4%',
    top: '8%',
    containLabel: true
  },
  xAxis: [
    {
      type: 'category',
      data: [
        t('analysis.monday'),
        t('analysis.tuesday'),
        t('analysis.wednesday'),
        t('analysis.thursday'),
        t('analysis.friday'),
        t('analysis.saturday'),
        t('analysis.sunday')
      ],
      axisTick: {
        show: false,
        alignWithLabel: true
      },
      axisLine: {
        lineStyle: {
          color: '#eaeaea'
        }
      },
      axisLabel: {
        color: '#666',
        fontSize: 12
      }
    }
  ],
  yAxis: [
    {
      type: 'value',
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#eaeaea'
        }
      },
      axisLabel: {
        color: '#666',
        fontSize: 12,
        formatter: function (value: number) {
          if (value >= 1000) {
            return (value / 1000).toFixed(0) + 'k'
          }
          return value.toString()
        }
      }
    }
  ],
  series: [
    {
      name: t('analysis.activeQuantity'),
      type: 'bar',
      barWidth: '60%',
      barMaxWidth: 50,
      itemStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'var(--chart-color-1)' },
            { offset: 1, color: 'var(--chart-color-1-light, rgba(84, 112, 198, 0.6))' }
          ]
        },
        borderRadius: [4, 4, 0, 0]
      },
      emphasis: {
        focus: 'series',
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.1)'
        }
      },
      data: []
    }
  ],
  animationDuration: 1500,
  animationEasing: 'cubicOut'
}

export const radarOption: EChartsOption = {
  legend: {
    data: [t('workplace.personal'), t('workplace.team')]
  },
  radar: {
    // shape: 'circle',
    indicator: [
      { name: t('workplace.quote'), max: 65 },
      { name: t('workplace.contribution'), max: 160 },
      { name: t('workplace.hot'), max: 300 },
      { name: t('workplace.yield'), max: 130 },
      { name: t('workplace.follow'), max: 100 }
    ]
  },
  series: [
    {
      name: `xxx${t('workplace.index')}`,
      type: 'radar',
      data: [
        {
          value: [42, 30, 20, 35, 80],
          name: t('workplace.personal')
        },
        {
          value: [50, 140, 290, 100, 90],
          name: t('workplace.team')
        }
      ]
    }
  ]
}

export const wordOptions = {
  series: [
    {
      type: 'wordCloud',
      gridSize: 2,
      sizeRange: [12, 50],
      rotationRange: [-90, 90],
      shape: 'pentagon',
      width: 600,
      height: 400,
      drawOutOfBound: true,
      textStyle: {
        color: function () {
          return (
            'rgb(' +
            [
              Math.round(Math.random() * 160),
              Math.round(Math.random() * 160),
              Math.round(Math.random() * 160)
            ].join(',') +
            ')'
          )
        }
      },
      emphasis: {
        textStyle: {
          shadowBlur: 10,
          shadowColor: '#333'
        }
      },
      data: [
        {
          name: 'Sam S Club',
          value: 10000,
          textStyle: {
            color: 'black'
          },
          emphasis: {
            textStyle: {
              color: 'red'
            }
          }
        },
        {
          name: 'Macys',
          value: 6181
        },
        {
          name: 'Amy Schumer',
          value: 4386
        },
        {
          name: 'Jurassic World',
          value: 4055
        },
        {
          name: 'Charter Communications',
          value: 2467
        },
        {
          name: 'Chick Fil A',
          value: 2244
        },
        {
          name: 'Planet Fitness',
          value: 1898
        },
        {
          name: 'Pitch Perfect',
          value: 1484
        },
        {
          name: 'Express',
          value: 1112
        },
        {
          name: 'Home',
          value: 965
        },
        {
          name: 'Johnny Depp',
          value: 847
        },
        {
          name: 'Lena Dunham',
          value: 582
        },
        {
          name: 'Lewis Hamilton',
          value: 555
        },
        {
          name: 'KXAN',
          value: 550
        },
        {
          name: 'Mary Ellen Mark',
          value: 462
        },
        {
          name: 'Farrah Abraham',
          value: 366
        },
        {
          name: 'Rita Ora',
          value: 360
        },
        {
          name: 'Serena Williams',
          value: 282
        },
        {
          name: 'NCAA baseball tournament',
          value: 273
        },
        {
          name: 'Point Break',
          value: 265
        }
      ]
    }
  ]
}

export const pieOptions: EChartsOption = {
  tooltip: {
    trigger: 'item',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    textStyle: {
      color: '#333'
    },
    formatter: '{a} <br/>{b}: {c} ({d}%)'
  },
  legend: {
    type: 'scroll',
    orient: 'horizontal',
    bottom: 0,
    data: [],
    itemGap: 20,
    textStyle: {
      color: '#666',
      fontSize: 12
    },
    itemWidth: 15,
    itemHeight: 10,
    icon: 'rect'
  },
  color: [
    'var(--chart-color-1)',
    'var(--chart-color-2)',
    'var(--chart-color-3)',
    'var(--chart-color-4)',
    'var(--chart-color-5)',
    'var(--chart-color-6)',
    'var(--chart-color-7)',
    'var(--chart-color-8)'
  ],
  series: [
    {
      name: t('analysis.accessSource'),
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '40%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: false
      },
      emphasis: {
        label: {
          show: true,
          fontWeight: 'bold'
        },
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.2)'
        }
      },
      labelLine: {
        show: false
      },
      data: []
    }
  ],
  animationDuration: 1500,
  animationEasing: 'cubicOut'
}
