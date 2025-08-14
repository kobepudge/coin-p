"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSearch = exports.validateSorting = exports.validatePagination = exports.validateFileUpload = exports.validate = exports.validateRequest = void 0;
const express_validator_1 = require("express-validator");
const error_1 = require("@/middlewares/error");
const logger_1 = require("@/utils/logger");
/**
 * 验证请求数据中间件
 */
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const validationErrors = {};
        errors.array().forEach((error) => {
            const field = error.path || error.param || 'unknown';
            if (!validationErrors[field]) {
                validationErrors[field] = [];
            }
            validationErrors[field].push(error.msg);
        });
        logger_1.logger.warn('请求验证失败:', {
            url: req.originalUrl,
            method: req.method,
            errors: validationErrors,
            body: req.body,
            params: req.params,
            query: req.query
        });
        return next(new error_1.ValidationError(validationErrors));
    }
    next();
};
exports.validateRequest = validateRequest;
/**
 * 创建验证规则组合
 */
const validate = (validations) => {
    return async (req, res, next) => {
        // 执行所有验证规则
        await Promise.all(validations.map(validation => validation.run(req)));
        // 检查验证结果
        (0, exports.validateRequest)(req, res, next);
    };
};
exports.validate = validate;
/**
 * 文件上传验证中间件
 */
const validateFileUpload = (allowedTypes = ['image/jpeg', 'image/png', 'image/gif'], maxSize = 5 * 1024 * 1024 // 5MB
) => {
    return (req, res, next) => {
        if (!req.file && !req.files) {
            return next();
        }
        const files = req.files ? (Array.isArray(req.files) ? req.files : [req.file]) : [req.file];
        for (const file of files) {
            if (!file)
                continue;
            // 检查文件类型
            if (!allowedTypes.includes(file.mimetype)) {
                return next(new error_1.ValidationError({ file: [`不支持的文件类型: ${file.mimetype}`] }, '文件类型不被允许'));
            }
            // 检查文件大小
            if (file.size > maxSize) {
                return next(new error_1.ValidationError({ file: [`文件大小超出限制: ${Math.round(file.size / 1024 / 1024)}MB > ${Math.round(maxSize / 1024 / 1024)}MB`] }, '文件大小超出限制'));
            }
        }
        next();
    };
};
exports.validateFileUpload = validateFileUpload;
/**
 * 分页参数验证中间件
 */
const validatePagination = (defaultPage = 1, defaultLimit = 10, maxLimit = 100) => {
    return (req, res, next) => {
        // 处理页码
        let page = parseInt(req.query.page) || defaultPage;
        if (page < 1)
            page = defaultPage;
        // 处理每页数量
        let limit = parseInt(req.query.limit) || defaultLimit;
        if (limit < 1)
            limit = defaultLimit;
        if (limit > maxLimit)
            limit = maxLimit;
        // 添加到请求对象
        req.pagination = {
            page,
            limit,
            offset: (page - 1) * limit
        };
        next();
    };
};
exports.validatePagination = validatePagination;
/**
 * 排序参数验证中间件
 */
const validateSorting = (allowedFields = []) => {
    return (req, res, next) => {
        const sort = req.query.sort;
        const order = req.query.order?.toLowerCase();
        // 默认排序
        let sortField = 'created_at';
        let sortOrder = 'desc';
        // 验证排序字段
        if (sort && allowedFields.includes(sort)) {
            sortField = sort;
        }
        // 验证排序方向
        if (order === 'asc' || order === 'desc') {
            sortOrder = order;
        }
        // 添加到请求对象
        req.sorting = {
            field: sortField,
            order: sortOrder
        };
        next();
    };
};
exports.validateSorting = validateSorting;
/**
 * 搜索参数验证中间件
 */
const validateSearch = (searchFields = [], maxLength = 100) => {
    return (req, res, next) => {
        const search = req.query.search;
        if (search) {
            // 验证搜索关键词长度
            if (search.length > maxLength) {
                return next(new error_1.ValidationError({ search: [`搜索关键词长度不能超过${maxLength}个字符`] }, '搜索参数无效'));
            }
            // 清理搜索关键词
            const cleanedSearch = search.trim();
            if (cleanedSearch.length === 0) {
                req.search = undefined;
            }
            else {
                req.search = {
                    keyword: cleanedSearch,
                    fields: searchFields
                };
            }
        }
        next();
    };
};
exports.validateSearch = validateSearch;
