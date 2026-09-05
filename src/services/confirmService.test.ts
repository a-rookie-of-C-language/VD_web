import { promptRequired, confirmAction } from './confirmService'

async function flushRender() {
  await Promise.resolve()
  await Promise.resolve()
}

describe('confirmService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('returns true when confirm button is clicked', async () => {
    const pending = confirmAction('确定要退出登录吗？')

    vi.advanceTimersByTime(20)
    await flushRender()
    const confirmBtn = document.querySelector('.cc-btn-confirm') as HTMLButtonElement
    expect(confirmBtn).not.toBeNull()
    confirmBtn.click()

    vi.advanceTimersByTime(320)
    await Promise.resolve()

    await expect(pending).resolves.toBe(true)
  })

  it('returns null for prompt when cancelled', async () => {
    const pending = promptRequired('请输入驳回原因')

    vi.advanceTimersByTime(20)
    await flushRender()
    const cancelBtn = document.querySelector('.cc-btn-cancel') as HTMLButtonElement
    expect(cancelBtn).not.toBeNull()
    cancelBtn.click()

    vi.advanceTimersByTime(320)
    await Promise.resolve()

    await expect(pending).resolves.toBeNull()
  })

  it('returns prompt input value when confirmed', async () => {
    const pending = promptRequired('请输入驳回原因')

    vi.advanceTimersByTime(20)
    await flushRender()
    const input = document.querySelector('.cc-input') as HTMLInputElement
    expect(input).not.toBeNull()
    input.value = '信息不完整'
    input.dispatchEvent(new Event('input'))

    const confirmBtn = document.querySelector('.cc-btn-confirm') as HTMLButtonElement
    confirmBtn.click()

    vi.advanceTimersByTime(320)
    await Promise.resolve()

    await expect(pending).resolves.toBe('信息不完整')
  })
})
