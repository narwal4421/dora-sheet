"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRouter = void 0;
const express_1 = require("express");
const ai_controller_1 = require("./ai.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
exports.aiRouter = (0, express_1.Router)();
exports.aiRouter.use(auth_middleware_1.requireAuth);
exports.aiRouter.post('/chat', ai_controller_1.AIController.chat);
