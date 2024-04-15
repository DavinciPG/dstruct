const { Router } = require('express');

const documentController = require('../controllers/documentController');

const router = Router();

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, 'uploads'))
    },
    filename: function(req, file, cb) {
        const timestamp = Date.now();
        const uuid = uuidv4();
        const extension = path.extname(file.originalname);
        cb(null, `${timestamp}-${uuid}${extension}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // no larger than 5mb
    },
});

router.get('/documents', documentController.getAllDocuments);

router.put('/documents', documentController.createDocument);

router.get('/documents/:id', documentController.getDocumentById);

router.delete('/documents/:id', documentController.deleteDocument);

router.post('/documents/:id', documentController.updateDocument);

router.get('/documents/:id/share', documentController.getSharedToDocument);

router.put('/documents/:id/share', documentController.shareDocument);

router.put('/documents/upload', upload.single('file'), documentController.uploadDocument);

router.put('/documents/upload/details', documentController.uploadDocumentDetails);

router.get('/documents/:id/download', documentController.downloadDocument);

module.exports = router;