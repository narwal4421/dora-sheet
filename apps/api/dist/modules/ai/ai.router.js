"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRouter = void 0;
const express_1 = require("express");
const ai_controller_1 = require("./ai.controller");
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
exports.aiRouter = (0, express_1.Router)();
/** @swagger /api/v1/ai/chat: post: summary: AI Chat tags: [AI] */
exports.aiRouter.post('/chat', upload.single('attachedFile'), ai_controller_1.AIController.chat);
