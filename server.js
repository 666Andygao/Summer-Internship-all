const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'ich-heritage-platform-secret-key-2026';

// ============ 中间件 ============
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 确保上传目录存在
const uploadsDir = path.join(__dirname, 'uploads');
const videosDir = path.join(uploadsDir, 'videos');
const imagesDir = path.join(uploadsDir, 'images');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

// 文件上传配置
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const isVideo = file.mimetype.startsWith('video/');
        cb(null, isVideo ? videosDir : imagesDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, uuidv4() + ext);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
    fileFilter: (req, file, cb) => {
        const allowed = /^(video\/|image\/)/;
        cb(null, allowed.test(file.mimetype));
    }
});

// ============ JSON 文件数据库 ============
const DB_PATH = path.join(__dirname, 'database.json');

function loadDB() {
    if (!fs.existsSync(DB_PATH)) {
        return { users: [], conversations: [], messages: [], nextId: { user: 1, conversation: 1, message: 1 } };
    }
    try {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    } catch (e) {
        console.error('数据库文件损坏，创建新数据库');
        return { users: [], conversations: [], messages: [], nextId: { user: 1, conversation: 1, message: 1 } };
    }
}

function saveDB(db) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

// 初始化数据库
let db = loadDB();
// 确保 nextId 存在（兼容旧数据）
if (!db.nextId) db.nextId = { user: 1, conversation: 1, message: 1 };
if (!Array.isArray(db.messages)) db.messages = [];

// ============ 认证中间件 ============
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: '请先登录' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ error: '登录已过期，请重新登录' });
    }
}

// ============ API 路由 ============

// 注册
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, role, display_name } = req.body;

        if (!username || !password || !role || !display_name) {
            return res.status(400).json({ error: '请填写所有必填字段' });
        }
        if (!['user', 'developer'].includes(role)) {
            return res.status(400).json({ error: '角色无效' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: '密码至少6位' });
        }

        // 重新加载数据库以获取最新数据
        db = loadDB();

        const existing = db.users.find(u => u.username === username);
        if (existing) {
            return res.status(400).json({ error: '用户名已存在' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const id = db.nextId.user++;
        const now = new Date().toISOString();

        const newUser = {
            id,
            username,
            password: hashedPassword,
            role,
            display_name,
            avatar: '',
            created_at: now
        };
        db.users.push(newUser);
        saveDB(db);

        const token = jwt.sign(
            { id, username, role, display_name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id, username, role, display_name }
        });
    } catch (e) {
        res.status(500).json({ error: '注册失败: ' + e.message });
    }
});

// 登录
app.post('/api/login', async (req, res) => {
    try {
        const { username, password, role } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({ error: '请填写所有必填字段' });
        }

        db = loadDB();
        const user = db.users.find(u => u.username === username && u.role === role);

        if (!user) {
            return res.status(400).json({ error: '用户名或密码错误，或角色不匹配' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(400).json({ error: '用户名或密码错误' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, display_name: user.display_name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                display_name: user.display_name
            }
        });
    } catch (e) {
        res.status(500).json({ error: '登录失败: ' + e.message });
    }
});

// 获取当前用户信息
app.get('/api/me', authMiddleware, (req, res) => {
    db = loadDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const { password, ...userInfo } = user;
    res.json(userInfo);
});

// 获取对方角色列表（用户看开发者，开发者看用户）
app.get('/api/contacts', authMiddleware, (req, res) => {
    db = loadDB();
    const oppositeRole = req.user.role === 'user' ? 'developer' : 'user';
    const contacts = db.users
        .filter(u => u.role === oppositeRole)
        .map(({ password, ...rest }) => rest)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(contacts);
});

// 获取或创建对话
app.post('/api/conversations', authMiddleware, (req, res) => {
    const { target_id } = req.body;
    db = loadDB();
    const target = db.users.find(u => u.id === target_id);
    if (!target) return res.status(404).json({ error: '对方不存在' });

    const userId = req.user.role === 'user' ? req.user.id : target_id;
    const devId = req.user.role === 'developer' ? req.user.id : target_id;

    let conv = db.conversations.find(c => c.user_id === userId && c.developer_id === devId);

    if (!conv) {
        const id = db.nextId.conversation++;
        conv = {
            id,
            user_id: userId,
            developer_id: devId,
            created_at: new Date().toISOString()
        };
        db.conversations.push(conv);
        saveDB(db);
    }

    res.json(conv);
});

// 获取我的对话列表
app.get('/api/conversations', authMiddleware, (req, res) => {
    db = loadDB();
    let convs;

    if (req.user.role === 'user') {
        convs = db.conversations
            .filter(c => c.user_id === req.user.id)
            .map(c => {
                const dev = db.users.find(u => u.id === c.developer_id);
                const unread = db.messages.filter(m =>
                    m.conversation_id === c.id && m.sender_id !== req.user.id && !m.is_read
                ).length;
                return {
                    ...c,
                    target_name: dev?.display_name || '',
                    target_username: dev?.username || '',
                    target_avatar: dev?.avatar || '',
                    unread
                };
            });
    } else {
        convs = db.conversations
            .filter(c => c.developer_id === req.user.id)
            .map(c => {
                const user = db.users.find(u => u.id === c.user_id);
                const unread = db.messages.filter(m =>
                    m.conversation_id === c.id && m.sender_id !== req.user.id && !m.is_read
                ).length;
                return {
                    ...c,
                    target_name: user?.display_name || '',
                    target_username: user?.username || '',
                    target_avatar: user?.avatar || '',
                    unread
                };
            });
    }

    convs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(convs);
});

// 获取对话消息
app.get('/api/conversations/:id/messages', authMiddleware, (req, res) => {
    db = loadDB();
    const convId = parseInt(req.params.id);
    const conv = db.conversations.find(c => c.id === convId);
    if (!conv) return res.status(404).json({ error: '对话不存在' });

    // 验证权限
    if (conv.user_id !== req.user.id && conv.developer_id !== req.user.id) {
        return res.status(403).json({ error: '无权访问' });
    }

    // 标记已读
    let changed = false;
    db.messages.forEach(m => {
        if (m.conversation_id === convId && m.sender_id !== req.user.id && !m.is_read) {
            m.is_read = true;
            changed = true;
        }
    });
    if (changed) saveDB(db);

    const messages = db.messages
        .filter(m => m.conversation_id === convId)
        .map(m => {
            const sender = db.users.find(u => u.id === m.sender_id);
            return {
                ...m,
                sender_name: sender?.display_name || '',
                sender_role: sender?.role || ''
            };
        })
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    res.json(messages);
});

// 发送消息
app.post('/api/conversations/:id/messages', authMiddleware, upload.single('file'), (req, res) => {
    db = loadDB();
    const convId = parseInt(req.params.id);
    const conv = db.conversations.find(c => c.id === convId);
    if (!conv) return res.status(404).json({ error: '对话不存在' });

    if (conv.user_id !== req.user.id && conv.developer_id !== req.user.id) {
        return res.status(403).json({ error: '无权访问' });
    }

    const content = req.body.content || '';
    let file_path = '';
    let file_type = '';
    let file_name = '';

    if (req.file) {
        file_path = '/uploads/' + (req.file.mimetype.startsWith('video/') ? 'videos/' : 'images/') + req.file.filename;
        file_type = req.file.mimetype;
        file_name = req.file.originalname;
    }

    if (!content && !req.file) {
        return res.status(400).json({ error: '消息内容不能为空' });
    }

    const id = db.nextId.message++;
    const now = new Date().toISOString();
    const msg = {
        id,
        conversation_id: convId,
        sender_id: req.user.id,
        content,
        file_path,
        file_type,
        file_name,
        is_read: false,
        created_at: now
    };
    db.messages.push(msg);
    saveDB(db);

    const sender = db.users.find(u => u.id === req.user.id);
    res.json({
        ...msg,
        sender_name: sender?.display_name || '',
        sender_role: sender?.role || ''
    });
});

// 搜索用户
app.get('/api/search', authMiddleware, (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);

    db = loadDB();
    const oppositeRole = req.user.role === 'user' ? 'developer' : 'user';
    const results = db.users
        .filter(u => u.role === oppositeRole &&
            (u.display_name.includes(q) || u.username.includes(q)))
        .map(({ password, ...rest }) => rest)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 20);

    res.json(results);
});

// ============ 静态文件服务（上传目录） ============
app.use('/uploads', express.static(uploadsDir));

// ============ 启动服务器 ============
app.listen(PORT, () => {
    console.log('========================================');
    console.log('  华夏风物 · 非遗传承 后端服务');
    console.log('========================================');
    console.log(`  ✅ 服务器运行在: http://localhost:${PORT}`);
    console.log(`  🏠 主页:        http://localhost:${PORT}/MainPage.html`);
    console.log(`  🔐 登录注册:    http://localhost:${PORT}/login.html`);
    console.log(`  👤 用户中心:    http://localhost:${PORT}/user-dashboard.html`);
    console.log(`  👨‍💻 开发者中心:  http://localhost:${PORT}/developer-dashboard.html`);
    console.log('========================================');
});
