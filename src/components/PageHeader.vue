<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  gradient?: string
}>()
</script>

<template>
  <div class="page-header">
    <div class="page-header-body">
      <div class="page-header-text">
        <h1 class="page-header-title">{{ title }}</h1>
        <p v-if="subtitle" class="page-header-subtitle">{{ subtitle }}</p>
      </div>
      <div class="page-header-controls">
        <slot name="controls" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  padding: 28px 32px 20px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--card-border);
  margin-bottom: 0;
}

.page-header-body {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.page-header-text {
  flex: 1;
  min-width: 0;
}

.page-header-title {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px 0;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.page-header-subtitle {
  font-size: 13.5px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

.page-header-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .page-header {
    padding: 20px 16px 16px;
  }

  .page-header-title {
    font-size: 18px;
  }

  .page-header-body {
    flex-direction: column;
    align-items: flex-start;
  }

  .page-header-controls {
    width: 100%;
  }
}
</style>
