import { getAccessToken, getRefreshToken, setToken } from '@/utils/auth'
import { useCache } from '@/hooks/web/useCache'
import axios from 'axios'
import { config } from '@/config/axios/config'
import { getTenantId } from '@/utils/auth'

const { wsCache } = useCache()
const { base_url } = config

// 刷新令牌的安全时间阈值（毫秒），在令牌过期前的这段时间内会触发刷新
// 默认为5分钟
const REFRESH_TOKEN_THRESHOLD = 5 * 60 * 1000

// 全局令牌刷新状态管理
interface TokenRefreshState {
  isRefreshing: boolean;       // 是否正在刷新中
  lastRefreshTime: number;     // 上次成功刷新的时间
  lastAttemptTime: number;     // 上次尝试刷新的时间
  refreshCount: number;        // 刷新计数器
  pendingPromise: Promise<any> | null; // 正在进行的刷新请求
}

const tokenRefreshState: TokenRefreshState = {
  isRefreshing: false,
  lastRefreshTime: 0,
  lastAttemptTime: 0,
  refreshCount: 0,
  pendingPromise: null
};

// 最小刷新间隔（毫秒）- 防止频繁刷新
const MIN_REFRESH_INTERVAL = 30 * 1000; // 30秒

// 检查令牌是否过期或即将过期
export const isTokenExpired = (expiresTime: number, threshold = REFRESH_TOKEN_THRESHOLD): boolean => {
  if (!expiresTime) return true
  
  // 当前时间加上阈值，如果大于过期时间，则认为令牌即将过期
  const now = Date.now()
  const isExpired = now + threshold > expiresTime
  
  // 添加日志，帮助调试
  if (isExpired) {
    console.log('令牌检查:', {
      当前时间: new Date(now).toLocaleString(),
      过期时间: new Date(expiresTime).toLocaleString(),
      阈值: threshold / 1000 + '秒',
      剩余时间: (expiresTime - now) / 1000 + '秒',
      结果: '即将过期'
    })
  }
  
  return isExpired
}

// 获取当前令牌的过期时间
export const getTokenExpiresTime = (): number => {
  const expiresTime = wsCache.get('TOKEN_EXPIRES_TIME')
  return expiresTime || 0
}

// 保存令牌过期时间
export const saveTokenExpiresTime = (expiresTime: number) => {
  if (!expiresTime || typeof expiresTime !== 'number') {
    console.error('保存令牌过期时间失败: 无效的过期时间', expiresTime)
    return
  }
  
  // 确保过期时间是毫秒级的时间戳
  // 如果是秒级时间戳，转换为毫秒级
  if (expiresTime < 10000000000) {
    expiresTime = expiresTime * 1000
    console.log('过期时间单位转换: 秒 -> 毫秒', expiresTime)
  }
  
  const now = Date.now()
  // 如果过期时间小于当前时间，可能是格式错误
  if (expiresTime < now) {
    console.error('保存令牌过期时间警告: 过期时间小于当前时间', {
      过期时间: new Date(expiresTime).toLocaleString(),
      当前时间: new Date(now).toLocaleString()
    })
  }
  
  console.log('保存令牌过期时间:', {
    过期时间: new Date(expiresTime).toLocaleString(),
    当前时间: new Date(now).toLocaleString(),
    剩余时间: Math.round((expiresTime - now) / 1000 / 60) + '分钟'
  })
  
  wsCache.set('TOKEN_EXPIRES_TIME', expiresTime)
}

// 统一的令牌刷新函数
export const refreshTokenProactively = async (): Promise<boolean> => {
  const now = Date.now();
  const refreshToken = getRefreshToken();
  
  // 检查是否可以刷新
  if (!refreshToken) {
    console.log('无法刷新令牌: 刷新令牌不存在');
    return false;
  }
  
  // 检查刷新间隔
  if (now - tokenRefreshState.lastAttemptTime < MIN_REFRESH_INTERVAL) {
    console.log('刷新请求被限制: 距离上次刷新尝试时间过短', {
      上次尝试: new Date(tokenRefreshState.lastAttemptTime).toLocaleString(),
      现在: new Date(now).toLocaleString(),
      间隔: (now - tokenRefreshState.lastAttemptTime) / 1000 + '秒',
      最小间隔: MIN_REFRESH_INTERVAL / 1000 + '秒'
    });
    return false;
  }
  
  // 如果已经有一个刷新请求在进行中，复用该请求
  if (tokenRefreshState.isRefreshing && tokenRefreshState.pendingPromise) {
    console.log('已有刷新请求进行中，等待该请求完成');
    try {
      await tokenRefreshState.pendingPromise;
      return true;
    } catch (error) {
      console.error('等待中的刷新请求失败', error);
      return false;
    }
  }
  
  // 更新刷新状态
  tokenRefreshState.isRefreshing = true;
  tokenRefreshState.lastAttemptTime = now;
  tokenRefreshState.refreshCount++;
  
  // 获取当前访问令牌，用于日志记录
  const currentAccessToken = getAccessToken();
  const tokenPrefix = currentAccessToken ? currentAccessToken.substring(0, 10) + '...' : '无';
  
  console.log('开始刷新令牌:', {
    当前令牌前缀: tokenPrefix,
    刷新次数: tokenRefreshState.refreshCount,
    刷新间隔: tokenRefreshState.lastRefreshTime ? (now - tokenRefreshState.lastRefreshTime) / 1000 + '秒' : '首次刷新'
  });
  
  // 创建刷新请求
  const refreshPromise = (async () => {
    try {
      // 设置租户ID到请求头
      axios.defaults.headers.common['tenant-id'] = getTenantId();
      
      // 调用刷新令牌接口
      const response = await axios.post(base_url + '/system/auth/refresh-token?refreshToken=' + refreshToken);
      
      if (response.data && response.data.code === 0) {
        // 设置新的令牌
        setToken(response.data.data);
        // 保存新的过期时间
        saveTokenExpiresTime(response.data.data.expiresTime);
        // 更新刷新时间
        tokenRefreshState.lastRefreshTime = Date.now();
        
        console.log('令牌刷新成功', {
          新过期时间: new Date(response.data.data.expiresTime).toLocaleString(),
          刷新次数: tokenRefreshState.refreshCount
        });
        return true;
      }
      
      console.error('刷新令牌响应异常:', response.data);
      return false;
    } catch (error) {
      console.error('刷新令牌请求失败:', error);
      return false;
    } finally {
      // 重置刷新状态
      tokenRefreshState.isRefreshing = false;
      tokenRefreshState.pendingPromise = null;
    }
  })();
  
  // 保存刷新请求
  tokenRefreshState.pendingPromise = refreshPromise;
  
  return refreshPromise;
}

// 防抖函数
const debounce = (fn: Function, delay: number) => {
  let timer: number | null = null;
  return function(this: any, ...args: any[]) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay) as unknown as number;
  };
};

// 启动令牌刷新检查器
export const startTokenRefreshChecker = () => {
  console.log('启动令牌刷新检查器');
  
  // 定义检查函数
  const checkTokenExpiration = async () => {
    const expiresTime = getTokenExpiresTime();
    if (isTokenExpired(expiresTime)) {
      console.log('定时检查: 令牌即将过期，尝试刷新');
      await refreshTokenProactively();
    }
  };
  
  // 立即执行一次检查
  checkTokenExpiration();
  
  // 设置定时器，每分钟检查一次
  setInterval(checkTokenExpiration, 60 * 1000);
};

// 用户活动监控，在用户活动时检查令牌
export const setupUserActivityMonitoring = () => {
  console.log('启动用户活动监控');
  
  // 防抖处理的令牌检查，避免频繁触发
  const debouncedCheckToken = debounce(async () => {
    const expiresTime = getTokenExpiresTime();
    if (isTokenExpired(expiresTime)) {
      console.log('用户活动触发: 令牌即将过期，尝试刷新');
      await refreshTokenProactively();
    }
  }, 10000); // 10秒防抖
  
  // 监听用户活动事件
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  
  events.forEach(event => {
    document.addEventListener(event, () => {
      debouncedCheckToken();
    });
  });
};

// 初始化令牌管理
export const initTokenManager = () => {
  startTokenRefreshChecker()
  setupUserActivityMonitoring()
} 