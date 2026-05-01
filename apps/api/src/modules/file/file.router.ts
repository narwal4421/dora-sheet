import { Router } from 'express';
import multer from 'multer';
import { FileController } from './file.controller';
import { requireAuth } from '../../middleware/auth.middleware';

export const fileRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

fileRouter.use(requireAuth);

fileRouter.post('/import/xlsx', upload.single('file'), FileController.importXlsx);
fileRouter.post('/import/csv', upload.single('file'), FileController.importCsv);
fileRouter.get('/export/:workbookId/xlsx', FileController.exportXlsx);
fileRouter.get('/export/:workbookId/pdf', FileController.exportPdf);
fileRouter.get('/export/:sheetId/csv', FileController.exportCsv);
