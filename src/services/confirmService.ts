import { h, render } from 'vue'
import CustomConfirm from '@/components/CustomConfirm.vue'

export const confirmAction = (message: string, title = '提示'): Promise<boolean> => {
  return new Promise((resolve) => {
    // Create container
    const container = document.createElement('div')
    document.body.appendChild(container)

    const cleanup = () => {
      // Delay unmount to allow exit animation to finish
      setTimeout(() => {
        render(null, container)
        if (container.parentNode) {
          container.parentNode.removeChild(container)
        }
      }, 300)
    }

    const vnode = h(CustomConfirm, {
      message,
      title,
      isPrompt: false,
      onResolve: (res: any) => {
        cleanup()
        resolve(res as boolean)
      }
    })

    // Render into container
    render(vnode, container)
  })
}

export const promptRequired = (message: string, _emptyMessage = '输入不能为空', title = '提示'): Promise<string | null> => {
  return new Promise((resolve) => {
    // Create container
    const container = document.createElement('div')
    document.body.appendChild(container)

    const cleanup = () => {
      // Delay unmount to allow exit animation to finish
      setTimeout(() => {
        render(null, container)
        if (container.parentNode) {
          container.parentNode.removeChild(container)
        }
      }, 300)
    }

    const vnode = h(CustomConfirm, {
      message,
      title,
      isPrompt: true,
      onResolve: (res: any) => {
        cleanup()
        resolve(res as string | null)
      }
    })

    // Render into container
    render(vnode, container)
  })
}
