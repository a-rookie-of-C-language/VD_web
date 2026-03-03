# 图片加载优化实现说明

## 概述

本项目已完成从 Base64 编码图片到 URL 路径的前端适配，实现了更高效的图片加载和浏览器缓存优化。

## 实现内容

### 1. 环境变量配置

创建了开发和生产环境的配置文件：

- `.env.development` - 开发环境配置
  ```
  VITE_API_BASE_URL=http://localhost:8080/api
  ```

- `.env.production` - 生产环境配置
  ```
  VITE_API_BASE_URL=https://your-production-api.com/api
  ```

### 2. 工具函数 (src/util/util.ts)

新增 `getCoverImageUrl` 函数用于封面图片的 URL 转换：

```typescript
export const getCoverImageUrl = (path: string): string => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 
    (import.meta.env.DEV ? 'http://localhost:8080/api' : '/api')
  
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  
  return `${baseUrl}/files/preview?path=${encodeURIComponent(normalizedPath)}`
}
```

更新 `getAttachmentUrl` 函数以使用环境变量：

```typescript
export const getAttachmentUrl = (path: string, type: 'download' | 'preview' = 'download'): string => {
  // 支持下载和预览两种模式
  const endpoint = type === 'preview' ? '/files/preview' : '/files/download'
  // ...
}
```

### 3. Vue Composable (src/composables/useImage.ts)

创建了可复用的图片处理 composable：

```typescript
export function useImage() {
  const getImageUrl = (relativePath?: string | null, fallback = ''): string => {
    if (!relativePath) return fallback
    return getCoverImageUrl(relativePath)
  }

  const getAttachment = (relativePath: string, type: 'download' | 'preview' = 'download'): string => {
    return getAttachmentUrl(relativePath, type)
  }

  const handleImageError = (event: Event, fallbackImage = '/default.png') => {
    // 处理图片加载错误
  }

  return { getImageUrl, getAttachment, handleImageError }
}
```

### 4. 组件更新

更新了所有使用封面图片的组件：

#### AllActivities.vue
```vue
<el-image
  :src="activity.CoverImage ? getCoverImageUrl(activity.CoverImage) : defaultActivityImage"
  :alt="activity.name"
  class="card-image"
  fit="cover"
  lazy
/>
```

#### detail.vue
```vue
<el-image
  :src="activity.CoverImage ? getCoverImageUrl(activity.CoverImage) : defaultActivityImage"
  class="banner-image"
  fit="cover"
  lazy
/>
```

#### MyProjects.vue
```vue
<el-image
  v-if="viewActivity.CoverImage"
  :src="getCoverImageUrl(viewActivity.CoverImage)"
  class="view-cover"
  fit="cover"
  lazy
/>
```

#### AdminReview.vue
```vue
<el-image
  v-if="currentActivity.CoverImage"
  :src="getCoverImageUrl(currentActivity.CoverImage)"
  :preview-src-list="[getCoverImageUrl(currentActivity.CoverImage)]"
  fit="contain"
  style="max-width: 100%; max-height: 300px"
/>
```

### 5. Vite 代理配置

在 `vite.config.ts` 中添加了开发环境代理：

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    }
  }
}
```

## API 使用说明

### 封面图片预览
```
GET /api/files/preview?path=/covers/xxx.png
```

### 附件下载
```
GET /api/files/download?path=/attachments/xxx.pdf
```

### 附件预览
```
GET /api/files/preview?path=/attachments/xxx.pdf
```

## 特性

✅ **性能优化**
- 使用 URL 替代 Base64，减少响应体积
- 浏览器自动缓存图片，减少重复请求
- 支持懒加载 (`lazy` 属性)

✅ **安全性**
- 后端路径穿越防护
- URL 编码防止注入攻击

✅ **用户体验**
- 加载占位符显示
- 错误时显示默认图片
- 支持图片预览功能

✅ **可维护性**
- 统一的工具函数管理
- 环境变量配置
- 可复用的 composable

## 使用示例

### 在组件中使用

```vue
<script setup lang="ts">
import { getCoverImageUrl } from '@/util/util'
import defaultImage from '@/image/default.png'

// 直接使用
const imageUrl = getCoverImageUrl(activity.CoverImage)
</script>

<template>
  <el-image
    :src="activity.CoverImage ? getCoverImageUrl(activity.CoverImage) : defaultImage"
    fit="cover"
    lazy
  >
    <template #error>
      <img :src="defaultImage" alt="默认图片" />
    </template>
  </el-image>
</template>
```

### 使用 Composable

```vue
<script setup lang="ts">
import { useImage } from '@/composables/useImage'

const { getImageUrl, handleImageError } = useImage()
</script>

<template>
  <img 
    :src="getImageUrl(activity.CoverImage, '/default.png')" 
    @error="handleImageError($event, '/default.png')"
    alt="活动封面"
  />
</template>
```

## 浏览器缓存验证

打开浏览器开发者工具 Network 面板：
1. 首次加载图片 - 状态码 200，从服务器获取
2. 再次加载 - Size 显示 `(disk cache)` 或 `(memory cache)`

## 测试清单

- [x] 所有活动列表页图片正常显示
- [x] 活动详情页图片正常显示
- [x] 我的项目页图片正常显示
- [x] 管理员审核页图片正常显示
- [x] 图片懒加载功能正常
- [x] 图片加载失败显示默认图
- [x] 浏览器缓存生效
- [x] 环境变量配置正确

## 部署注意事项

### 开发环境
1. 确保后端服务运行在 `http://localhost:8080`
2. Vite 代理会自动转发 `/api` 请求

### 生产环境
1. 更新 `.env.production` 中的 `VITE_API_BASE_URL`
2. 确保后端 CORS 配置允许前端域名
3. 确保静态文件服务正确配置

## 后续优化建议

1. **响应式图片**: 根据设备尺寸加载不同大小的图片
2. **WebP 格式**: 支持更现代的图片格式
3. **CDN 加速**: 将图片上传到 CDN 服务
4. **图片懒加载优化**: 使用 Intersection Observer API
5. **预加载关键图片**: 首屏关键图片预加载

## 常见问题

### Q: 图片显示 404
A: 检查：
- 后端服务是否正常运行
- API_BASE_URL 配置是否正确
- 图片路径格式是否正确

### Q: 开发环境图片不显示
A: 检查：
- Vite 代理配置是否正确
- 后端 CORS 是否允许 localhost:5173
- 浏览器控制台是否有错误信息

### Q: 生产环境图片不显示
A: 检查：
- 生产环境 API URL 是否正确
- 后端 CORS 配置是否包含生产域名
- 网络请求是否被防火墙拦截

