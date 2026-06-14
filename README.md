# 星屑纪念馆 ✦

一个情感向的 Web 应用，让你珍藏那些值得被永远铭记的时光。上传照片、语音和文字，创建专属于你的回忆展厅。

## 技术栈

- **前端**: React 18 + React Router + Vite + Sass
- **后端**: Node.js + Fastify
- **存储**: 本地文件存储（JSON + 文件系统），无需第三方服务

## 功能模块

### 1. 展厅创建
- 创建个性化纪念馆展厅
- 上传封面图片
- 自定义展厅主题（暖阳、深海、林间、黄昏、星夜、樱花）
- 编辑展厅信息

### 2. 素材管理
- 📷 上传照片（JPG/PNG/GIF/WebP等）
- 🎵 上传语音（MP3/WAV/OGG等）
- 🎬 上传视频
- ✎ 添加文字回忆
- 素材分类展示、编辑、删除

### 3. 时间轴播放
- 创建时间节点记录重要时刻
- 将素材关联到时间节点
- 沉浸式回忆播放模式
- 自动轮播/手动切换
- 进度指示与快速跳转

### 4. 访客留言
- 游客留下祝福与思念
- 留言展示与删除
- 自动生成头像配色

### 5. 文件服务
- 本地文件上传与存储
- 自动分类存储（图片/音频/视频）
- 静态文件服务

## 项目结构

```
stardust-memorial/
├── client/                    # 前端 React 应用
│   ├── src/
│   │   ├── components/        # 可复用组件
│   │   ├── pages/             # 页面组件
│   │   ├── services/          # API 服务
│   │   └── styles/            # Sass 样式
│   └── package.json
├── server/                    # 后端 Fastify 服务
│   ├── src/
│   │   ├── routes/            # 路由模块
│   │   ├── index.js           # 服务入口
│   │   └── storage.js         # 本地存储管理
│   ├── data/                  # JSON 数据存储
│   ├── uploads/               # 用户上传文件
│   └── package.json
└── package.json               # 根项目配置
```

## 快速开始

### 1. 安装依赖

在项目根目录执行：

```bash
npm run install:all
```

或者分别安装：

```bash
# 根目录
npm install

# 后端
cd server && npm install

# 前端
cd ../client && npm install
```

### 2. 启动开发环境

在项目根目录执行（同时启动前后端）：

```bash
npm run dev
```

- 后端服务: http://localhost:4500
- 前端应用: http://localhost:5173

### 3. 生产部署

```bash
# 构建前端
npm run build

# 启动服务
npm start
```

## API 接口

### 展厅 (Exhibitions)
- `GET /api/exhibitions` - 获取展厅列表
- `GET /api/exhibitions/:id` - 获取展厅详情
- `POST /api/exhibitions` - 创建展厅
- `PUT /api/exhibitions/:id` - 更新展厅
- `DELETE /api/exhibitions/:id` - 删除展厅

### 素材 (Materials)
- `GET /api/materials?exhibitionId=` - 获取素材列表
- `POST /api/materials` - 创建素材
- `PUT /api/materials/:id` - 更新素材
- `DELETE /api/materials/:id` - 删除素材

### 时间轴 (Timelines)
- `GET /api/timelines?exhibitionId=` - 获取时间节点
- `POST /api/timelines` - 创建时间节点
- `PUT /api/timelines/:id` - 更新时间节点
- `DELETE /api/timelines/:id` - 删除时间节点

### 留言 (Messages)
- `GET /api/messages?exhibitionId=` - 获取留言列表
- `POST /api/messages` - 创建留言
- `DELETE /api/messages/:id` - 删除留言

### 文件 (Files)
- `POST /api/files/upload` - 上传文件（multipart/form-data）
- `DELETE /api/files/:type/:filename` - 删除文件

## 数据存储

所有数据存储在本地：
- `server/data/db.json` - 展厅、素材、时间轴、留言数据
- `server/uploads/images/` - 图片文件
- `server/uploads/audios/` - 音频文件
- `server/uploads/videos/` - 视频文件
- `server/uploads/others/` - 其他文件

---

愿每一段回忆，都如星屑般闪耀夜空 ✦
