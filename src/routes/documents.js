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

module.exports = router;