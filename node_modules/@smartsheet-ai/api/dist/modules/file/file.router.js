"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const file_controller_1 = require("./file.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
exports.fileRouter = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
exports.fileRouter.use(auth_middleware_1.requireAuth);
exports.fileRouter.post('/import/xlsx', upload.single('file'), file_controller_1.FileController.importXlsx);
exports.fileRouter.post('/import/csv', upload.single('file'), file_controller_1.FileController.importCsv);
exports.fileRouter.get('/export/:workbookId/xlsx', file_controller_1.FileController.exportXlsx);
exports.fileRouter.get('/export/:workbookId/pdf', file_controller_1.FileController.exportPdf);
exports.fileRouter.get('/export/:sheetId/csv', file_controller_1.FileController.exportCsv);
