<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

const props = defineProps({
  title: { type: String, default: '提示' },
  message: { type: String, required: true },
  isPrompt: { type: Boolean, default: false },
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' },
  onResolve: { type: Function, required: true }
})

const visible = ref(false)
const inputValue = ref('')
const errorMsg = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  // Trigger entry animation
  setTimeout(() => {
    visible.value = true
    if (props.isPrompt) {
      nextTick(() => {
        inputRef.value?.focus()
      })
    }
  }, 10)
  
  window.addEventListener('keydown', handleGlobalKeydown)
})

const handleGlobalKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleCancel()
  }
}

const cleanupAndResolve = (value: any) => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  visible.value = false
  // Wait for leave animation
  setTimeout(() => {
    props.onResolve(value)
  }, 200)
}

const handleCancel = () => {
  cleanupAndResolve(props.isPrompt ? null : false)
}

const handleConfirm = () => {
  if (props.isPrompt) {
    const val = inputValue.value.trim()
    if (!val) {
      errorMsg.value = '输入不能为空'
      inputRef.value?.focus()
      return
    }
    cleanupAndResolve(val)
  } else {
    cleanupAndResolve(true)
  }
}
</script>

<template>
  <div class="custom-confirm-wrapper">
    <transition name="cc-fade">
      <div v-if="visible" class="cc-overlay" @click.self="handleCancel"></div>
    </transition>
    <transition name="cc-zoom">
      <div v-if="visible" class="cc-dialog-container" @click.self="handleCancel">
        <div class="cc-dialog">
          <div class="cc-header">
            <span class="cc-title">{{ title }}</span>
            <button class="cc-close" @click="handleCancel">×</button>
          </div>
          <div class="cc-body">
            <p class="cc-message">{{ message }}</p>
            <div v-if="isPrompt" class="cc-input-wrapper">
              <input 
                ref="inputRef"
                v-model="inputValue" 
                class="cc-input" 
                :class="{ 'has-error': errorMsg }"
                type="text" 
                @keyup.enter="handleConfirm"
                @input="errorMsg = ''"
              />
              <p v-if="errorMsg" class="cc-error">{{ errorMsg }}</p>
            </div>
          </div>
          <div class="cc-footer">
            <button class="cc-btn cc-btn-cancel" @click="handleCancel">{{ cancelText }}</button>
            <button class="cc-btn cc-btn-confirm" @click="handleConfirm">{{ confirmText }}</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.custom-confirm-wrapper {
  position: relative;
  z-index: 999999;
}

.cc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(2px);
}

.cc-dialog-container {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.cc-dialog {
  background: #ffffff;
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: system-ui, -apple-system, sans-serif;
}

.cc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
}

.cc-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.cc-close {
  background: transparent;
  border: none;
  font-size: 24px;
  color: #94a3b8;
  cursor: pointer;
  line-height: 1;
  padding: 4px;
  margin: -4px;
  border-radius: 6px;
  transition: all 0.2s;
}

.cc-close:hover {
  color: #475569;
  background: #f1f5f9;
}

.cc-body {
  padding: 0 24px 24px;
  color: #475569;
  font-size: 15px;
  line-height: 1.5;
}

.cc-message {
  margin: 0;
}

.cc-input-wrapper {
  margin-top: 16px;
}

.cc-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  color: #1e293b;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.cc-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.cc-input.has-error {
  border-color: #ef4444;
}

.cc-error {
  margin: 6px 0 0;
  font-size: 13px;
  color: #ef4444;
}

.cc-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
}

.cc-btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.cc-btn-cancel {
  background: #ffffff;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.cc-btn-cancel:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.cc-btn-confirm {
  background: #6366f1;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.2);
}

.cc-btn-confirm:hover {
  background: #4f46e5;
  box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);
}

.cc-btn-confirm:active {
  transform: translateY(1px);
}

/* Animations */
.cc-fade-enter-active,
.cc-fade-leave-active {
  transition: opacity 0.2s ease;
}

.cc-fade-enter-from,
.cc-fade-leave-to {
  opacity: 0;
}

.cc-zoom-enter-active,
.cc-zoom-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.cc-zoom-enter-from,
.cc-zoom-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}
</style>
