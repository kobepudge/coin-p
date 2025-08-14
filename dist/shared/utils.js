"use strict";
// 共享工具函数
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatusColor = exports.hasPermission = exports.validateForm = exports.utils = exports.formatters = exports.validators = void 0;
const constants_1 = require("./constants");
// 验证工具
exports.validators = {
    // 用户名验证
    username: (value) => {
        if (!value)
            return '用户名不能为空';
        if (!constants_1.REGEX_PATTERNS.USERNAME.test(value)) {
            return '用户名只能包含字母、数字和下划线，长度3-30位';
        }
        return null;
    },
    // 密码验证
    password: (value) => {
        if (!value)
            return '密码不能为空';
        if (!constants_1.REGEX_PATTERNS.PASSWORD.test(value)) {
            return '密码长度必须在6-50位之间';
        }
        return null;
    },
    // 邮箱验证
    email: (value) => {
        if (!value)
            return null; // 邮箱可选
        if (!constants_1.REGEX_PATTERNS.EMAIL.test(value)) {
            return '邮箱格式不正确';
        }
        return null;
    },
    // 游戏ID验证
    gameId: (value) => {
        if (!value)
            return '游戏ID不能为空';
        if (!constants_1.REGEX_PATTERNS.GAME_ID.test(value)) {
            return '游戏ID只能包含字母、数字和下划线，长度1-50位';
        }
        return null;
    },
    // 必填字段验证
    required: (value, fieldName) => {
        if (value === null || value === undefined || value === '') {
            return `${fieldName}不能为空`;
        }
        return null;
    },
    // 数字验证
    number: (value, fieldName) => {
        if (isNaN(Number(value))) {
            return `${fieldName}必须是有效数字`;
        }
        return null;
    },
    // 最小长度验证
    minLength: (value, min, fieldName) => {
        if (!value || value.length < min) {
            return `${fieldName}长度不能少于${min}位`;
        }
        return null;
    },
    // 最大长度验证
    maxLength: (value, max, fieldName) => {
        if (value && value.length > max) {
            return `${fieldName}长度不能超过${max}位`;
        }
        return null;
    }
};
// 格式化工具
exports.formatters = {
    // 格式化日期
    date: (date, format = 'YYYY-MM-DD HH:mm:ss') => {
        const d = new Date(date);
        if (isNaN(d.getTime()))
            return '-';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return format
            .replace('YYYY', String(year))
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    },
    // 格式化相对时间
    relative: (date) => {
        const now = new Date();
        const target = new Date(date);
        const diff = now.getTime() - target.getTime();
        if (diff < 0)
            return '未来';
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0)
            return `${days}天前`;
        if (hours > 0)
            return `${hours}小时前`;
        if (minutes > 0)
            return `${minutes}分钟前`;
        return '刚刚';
    },
    // 格式化文件大小
    fileSize: (bytes) => {
        if (bytes === 0)
            return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    // 格式化金额
    currency: (amount, currency = '¥') => {
        return `${currency}${amount.toLocaleString('zh-CN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }
};
// 工具函数
exports.utils = {
    // 深度复制
    deepClone: (obj) => {
        if (obj === null || typeof obj !== 'object')
            return obj;
        if (obj instanceof Date)
            return new Date(obj.getTime());
        if (Array.isArray(obj))
            return obj.map(item => exports.utils.deepClone(item));
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = exports.utils.deepClone(obj[key]);
            }
        }
        return cloned;
    },
    // 防抖函数
    debounce: (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    },
    // 节流函数
    throttle: (func, limit) => {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    },
    // 生成随机字符串
    randomString: (length = 8) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },
    // 检查是否为移动设备
    isMobile: () => {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    // 获取文件扩展名
    getFileExtension: (filename) => {
        return filename.slice(filename.lastIndexOf('.'));
    },
    // URL参数解析
    parseQuery: (search) => {
        const params = new URLSearchParams(search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    },
    // 对象转URL参数
    toQueryString: (obj) => {
        return Object.keys(obj)
            .filter(key => obj[key] !== null && obj[key] !== undefined && obj[key] !== '')
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
            .join('&');
    },
    // 数组去重
    unique: (array) => {
        return Array.from(new Set(array));
    },
    // 数组分组
    groupBy: (array, key) => {
        return array.reduce((groups, item) => {
            const group = String(item[key]);
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    },
    // 延迟执行
    sleep: (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    // 获取图片预览URL
    getImagePreviewUrl: (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result);
            reader.readAsDataURL(file);
        });
    },
    // 压缩图片
    compressImage: (file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                // 计算压缩后的尺寸
                let { width, height } = img;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
                canvas.width = width;
                canvas.height = height;
                // 绘制压缩后的图片
                ctx.drawImage(img, 0, 0, width, height);
                // 转换为Blob
                canvas.toBlob((blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name, {
                            type: file.type,
                            lastModified: Date.now()
                        });
                        resolve(compressedFile);
                    }
                    else {
                        resolve(file);
                    }
                }, file.type, quality);
            };
            img.src = URL.createObjectURL(file);
        });
    }
};
// 表单验证帮助函数
const validateForm = (data, rules) => {
    const errors = {};
    for (const field in rules) {
        const fieldRules = rules[field];
        const value = data[field];
        const fieldErrors = [];
        for (const rule of fieldRules) {
            const error = rule(value);
            if (error) {
                fieldErrors.push(error);
                break; // 只显示第一个错误
            }
        }
        if (fieldErrors.length > 0) {
            errors[field] = fieldErrors;
        }
    }
    return errors;
};
exports.validateForm = validateForm;
// 权限检查工具
const hasPermission = (userPermissions, requiredPermission) => {
    return userPermissions[requiredPermission] === true;
};
exports.hasPermission = hasPermission;
// 状态颜色映射
const getStatusColor = (status) => {
    const colorMap = {
        active: 'success',
        inactive: 'error',
        online: 'success',
        offline: 'warning',
        pending: 'warning',
        completed: 'success',
        failed: 'error',
        rejected: 'error'
    };
    return colorMap[status] || 'default';
};
exports.getStatusColor = getStatusColor;
