"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMiddleware = exports.deleteFile = exports.uploadPaymentQr = exports.uploadImage = void 0;
const multer_1 = __importDefault(require("multer"));
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const logger_1 = require("@/utils/logger");
// 配置multer存储
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB限制
    },
    fileFilter: (req, file, cb) => {
        // 只允许图片文件
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('只允许上传图片文件'));
        }
    }
});
// 确保上传目录存在
const ensureUploadDir = async (dir) => {
    try {
        await promises_1.default.access(dir);
    }
    catch {
        await promises_1.default.mkdir(dir, { recursive: true });
    }
};
// 生成文件名
const generateFilename = (originalName) => {
    const ext = path_1.default.extname(originalName);
    const name = path_1.default.basename(originalName, ext);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${name}_${timestamp}_${random}${ext}`;
};
// 上传图片通用处理
const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '请选择要上传的文件'
            });
        }
        // 确保上传目录存在
        const uploadDir = path_1.default.join(process.cwd(), 'public', 'uploads', 'images');
        await ensureUploadDir(uploadDir);
        // 生成文件名
        const filename = generateFilename(req.file.originalname);
        const filepath = path_1.default.join(uploadDir, filename);
        // 使用sharp处理图片（压缩和格式转换）
        await (0, sharp_1.default)(req.file.buffer)
            .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true
        })
            .jpeg({ quality: 85 }) // 转为JPEG格式，85%质量
            .toFile(filepath);
        // 返回文件信息
        const fileUrl = `/uploads/images/${filename}`;
        logger_1.logger.info('文件上传成功:', {
            originalName: req.file.originalname,
            filename,
            size: req.file.size,
            url: fileUrl
        });
        res.json({
            success: true,
            data: {
                filename,
                original_name: req.file.originalname,
                size: req.file.size,
                mime_type: 'image/jpeg',
                url: fileUrl
            }
        });
    }
    catch (error) {
        logger_1.logger.error('文件上传失败:', error);
        res.status(500).json({
            success: false,
            message: '文件上传失败'
        });
    }
};
exports.uploadImage = uploadImage;
// 上传支付二维码
const uploadPaymentQr = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '请选择要上传的二维码图片'
            });
        }
        // 确保上传目录存在
        const uploadDir = path_1.default.join(process.cwd(), 'public', 'uploads', 'qr');
        await ensureUploadDir(uploadDir);
        // 生成文件名
        const filename = generateFilename(req.file.originalname);
        const filepath = path_1.default.join(uploadDir, filename);
        // 处理二维码图片（不压缩，保持清晰度）
        await (0, sharp_1.default)(req.file.buffer)
            .resize(500, 500, {
            fit: 'inside',
            withoutEnlargement: true
        })
            .png({ quality: 100 }) // 转为PNG格式，保持最高质量
            .toFile(filepath);
        const fileUrl = `/uploads/qr/${filename}`;
        logger_1.logger.info('支付二维码上传成功:', {
            originalName: req.file.originalname,
            filename,
            size: req.file.size,
            url: fileUrl
        });
        res.json({
            success: true,
            data: {
                filename,
                original_name: req.file.originalname,
                size: req.file.size,
                mime_type: 'image/png',
                url: fileUrl
            }
        });
    }
    catch (error) {
        logger_1.logger.error('支付二维码上传失败:', error);
        res.status(500).json({
            success: false,
            message: '支付二维码上传失败'
        });
    }
};
exports.uploadPaymentQr = uploadPaymentQr;
// 删除文件
const deleteFile = async (req, res) => {
    try {
        const { filename } = req.params;
        const { type } = req.query; // 'images' 或 'qr'
        if (!filename || !type) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数'
            });
        }
        if (!['images', 'qr'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: '无效的文件类型'
            });
        }
        const filepath = path_1.default.join(process.cwd(), 'public', 'uploads', type, filename);
        try {
            await promises_1.default.unlink(filepath);
            logger_1.logger.info('文件删除成功:', { filename, type });
            res.json({
                success: true,
                message: '文件删除成功'
            });
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                res.status(404).json({
                    success: false,
                    message: '文件不存在'
                });
            }
            else {
                throw error;
            }
        }
    }
    catch (error) {
        logger_1.logger.error('文件删除失败:', error);
        res.status(500).json({
            success: false,
            message: '文件删除失败'
        });
    }
};
exports.deleteFile = deleteFile;
// 导出multer中间件
exports.uploadMiddleware = {
    single: upload.single.bind(upload),
    array: upload.array.bind(upload),
    fields: upload.fields.bind(upload)
};
