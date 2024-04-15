const { Router } = require('express');

const documentController = require('../controllers/documentController');

const router = Router();

router.get('/documents', documentController.getAllDocuments);

router.put('/documents', documentController.createDocument);

router.get('/documents/:id', documentController.getDocumentById);

router.delete('/documents/:id', documentController.deleteDocument);

router.post('/documents/:id', documentController.updateDocument);

router.get('/documents/:id/share', documentController.getSharedToDocument);

router.put('/documents/:id/share', documentController.shareDocument);

router.put('/documents/upload', documentController.uploadDocument);

router.put('/documents/upload/details', documentController.uploadDocumentDetails);

router.get('/documents/:id/download', documentController.downloadDocument);

module.exports = router;