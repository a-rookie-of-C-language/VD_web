import { mount } from '@vue/test-utils'
import CustomConfirm from './CustomConfirm.vue'

describe('CustomConfirm', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('resolves true on confirm action', async () => {
    const onResolve = vi.fn()
    const wrapper = mount(CustomConfirm, {
      props: {
        message: '确定执行吗',
        onResolve
      }
    })

    vi.advanceTimersByTime(20)
    await wrapper.vm.$nextTick()

    await wrapper.find('.cc-btn-confirm').trigger('click')
    vi.advanceTimersByTime(220)

    expect(onResolve).toHaveBeenCalledWith(true)
  })

  it('resolves false on cancel action', async () => {
    const onResolve = vi.fn()
    const wrapper = mount(CustomConfirm, {
      props: {
        message: '确定执行吗',
        onResolve
      }
    })

    vi.advanceTimersByTime(20)
    await wrapper.vm.$nextTick()

    await wrapper.find('.cc-btn-cancel').trigger('click')
    vi.advanceTimersByTime(220)

    expect(onResolve).toHaveBeenCalledWith(false)
  })

  it('validates prompt input as required', async () => {
    const onResolve = vi.fn()
    const wrapper = mount(CustomConfirm, {
      props: {
        message: '请输入原因',
        isPrompt: true,
        onResolve
      }
    })

    vi.advanceTimersByTime(20)
    await wrapper.vm.$nextTick()

    await wrapper.find('.cc-btn-confirm').trigger('click')
    expect(wrapper.find('.cc-error').exists()).toBe(true)
    expect(onResolve).not.toHaveBeenCalled()

    const input = wrapper.find('.cc-input')
    await input.setValue('审批不通过，资料不完整')
    await wrapper.find('.cc-btn-confirm').trigger('click')
    vi.advanceTimersByTime(220)

    expect(onResolve).toHaveBeenCalledWith('审批不通过，资料不完整')
  })
})
