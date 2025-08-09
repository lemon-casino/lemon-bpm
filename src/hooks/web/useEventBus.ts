import mitt, { Emitter } from 'mitt'

type EventBusType = {
  emit: (eventKey: string, ...args: any[]) => void
  on: (eventKey: string, callback: Function) => void
  off: (eventKey: string, callback?: Function) => void
}

const emitter: Emitter<any> = mitt()

export const useEventBus = (key: string): EventBusType => {
  const emit = (eventKey: string, ...args: any[]) => {
    emitter.emit(`${key}-${eventKey}`, args)
  }

  const on = (eventKey: string, callback: Function) => {
    emitter.on(`${key}-${eventKey}`, callback as any)
  }

  const off = (eventKey: string, callback?: Function) => {
    emitter.off(`${key}-${eventKey}`, callback as any)
  }

  return {
    emit,
    on,
    off
  }
} 