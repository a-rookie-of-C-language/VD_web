import { ElMessage } from 'element-plus'
import { getErrorMessage } from './http'

export function notifyRequestError(error: unknown, fallbackMessage: string): void {
  console.error(error)
  ElMessage.error(getErrorMessage(error, fallbackMessage))
}
