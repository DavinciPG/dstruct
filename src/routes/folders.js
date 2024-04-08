const { Router } = require('express');

const folderController = require('../controllers/folderController');

const router = Router();

router.get('/folders', folderController.getAllFolders);

router.put('/folders', folderController.createFolder);

router.get('/folders/:id', folderController.getFolderByID);

router.delete('/folders/:id', folderController.deleteFolder);

router.post('/folders/:id', folderController.updateFolder);

router.get('/folders/:id/share', folderController.getSharedToFolder);

router.put('/folders/:id/share', folderController.shareFolder);

router.get('/folders/:id/documents', folderController.getDocumentsByFolderId);

module.exports = router;