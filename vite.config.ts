import {resolve} from 'path'
import type {ConfigEnv, UserConfig} from 'vite'
import {loadEnv} from 'vite'
import {createVitePlugins} from './build/vite'
import {exclude, include} from "./build/vite/optimize"
// 当前执行node命令时文件夹的地址(工作目录)
const root = process.cwd()

// 路径查找
function pathResolve(dir: string) {
    return resolve(root, '.', dir)
}

// https://vitejs.dev/config/
export default ({command, mode}: ConfigEnv): UserConfig => {
    let env = {} as any
    const isBuild = command === 'build'
    if (!isBuild) {
        env = loadEnv((process.argv[3] === '--mode' ? process.argv[4] : process.argv[3]), root)
    } else {
        env = loadEnv(mode, root)
    }
    return {
        base: env.VITE_BASE_PATH,
        root: root,
        // 服务端渲染
        server: {
            port: env.VITE_PORT, // 端口号
            host: "0.0.0.0",
            open: env.VITE_OPEN === 'true',
            headers: {
                'Permissions-Policy': 'accelerometer=(), deviceorientation=()'
            },
            // 本地跨域代理. 目前注释的原因：暂时没有用途，server 端已经支持跨域
            // proxy: {
            //   ['/admin-api']: {
            //     target: env.VITE_BASE_URL,
            //     ws: false,
            //     changeOrigin: true,
            //     rewrite: (path) => path.replace(new RegExp(`^/admin-api`), ''),
            //   },
            // },
        },
        // 项目使用的vite插件。 单独提取到build/vite/plugin中管理
        plugins: createVitePlugins(),
        css: {
            preprocessorOptions: {
                scss: {
                    additionalData: '@use "@/styles/variables.scss" as *;',
                    javascriptEnabled: true,
                    silenceDeprecations: ["legacy-js-api"], // 参考自 https://stackoverflow.com/questions/78997907/the-legacy-js-api-is-deprecated-and-will-be-removed-in-dart-sass-2-0-0
                }
            }
        },
        resolve: {
            extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss', '.css'],
            alias: [
                {
                    find: 'vue-i18n',
                    replacement: 'vue-i18n/dist/vue-i18n.cjs.js'
                },
                {
                    find: /\@\//,
                    replacement: `${pathResolve('src')}/`
                },
                {
                    find: 'camunda-bpmn-moddle',
                    replacement: `${pathResolve('node_modules/camunda-bpmn-moddle/dist/camunda-bpmn-moddle.js')}`
                }
            ]
        },
        build: {
            minify: 'terser',
            outDir: env.VITE_OUT_DIR || 'dist',
            sourcemap: env.VITE_SOURCEMAP === 'true' ? 'inline' : false,
            // brotliSize: false,
            terserOptions: {
                compress: {
                    drop_debugger: env.VITE_DROP_DEBUGGER === 'true',
                    drop_console: env.VITE_DROP_CONSOLE === 'true'
                }
            },
            rollupOptions: {
                output: {
                    manualChunks: {
                        echarts: ['echarts', 'echarts-wordcloud'], // 将 echarts 单独打包
                        vue: ['vue', 'vue-router', 'pinia', 'vue-i18n'], // Vue 核心库
                        elementPlus: ['element-plus', '@element-plus/icons-vue'], // Element Plus
                        bpmn: ['bpmn-js', 'bpmn-js-properties-panel', 'bpmn-js-token-simulation'], // 移除 camunda-bpmn-moddle
                        editor: ['@wangeditor/editor', '@wangeditor/editor-for-vue', '@wangeditor/plugin-mention'], // 编辑器相关库
                        utils: ['lodash', 'lodash-es', 'axios', 'dayjs', 'crypto-js'], // 工具库
                        formCreate: ['@form-create/element-ui', '@form-create/designer'] // 表单设计器
                    },
                    chunkFileNames: 'assets/js/[name]-[hash].js',
                    entryFileNames: 'assets/js/[name]-[hash].js',
                    assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
                },
            },
            chunkSizeWarningLimit: 2000, // 提高警告阈值，单位为 kB
        },
        optimizeDeps: {include, exclude},
        define: {
            'process.env': env
        }
    }
}
