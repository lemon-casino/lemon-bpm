interface DingTalkSDK {
  env: {
    platform: string
  }
  config: (config: {
    agentId: string
    corpId: string
    timeStamp: number
    nonceStr: string
    signature: string
    type?: number
    jsApiList: string[]
  }) => void
  ready: (callback: () => void) => void
  error: (callback: (error: any) => void) => void
  runtime: {
    permission: {
      requestAuthCode: (params: {
        corpId?: string
        onSuccess: (result: { code: string }) => void
        onFail: (err: any) => void
      }) => void
    }
  }
}

interface Window {
  dd?: DingTalkSDK
} 