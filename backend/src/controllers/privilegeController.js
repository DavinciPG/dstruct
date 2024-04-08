const db = require('../models');
const FolderPrivileges = db.folderprivileges;
const DocumentPrivileges = db.documentprivileges;

const privilegeController = {
    // Find Document Privileges for user
    async getDocumentPrivileges(req, res) {
        try {
            const { document_id, user_id } = req.body;
            const privileges = await DocumentPrivileges.findOne({
               where: {
                   document_id,
                   user_id
               }
            });

            return res.status(200).json(privileges);
        } catch (error) {
            console.error('Error finding privileges for document:', error);
        }
    },
    // Find Folder Privileges for user
    async getFolderPrivileges(req, res) {
        try {
            const { folder_id, user_id } = req.body;
            const privileges = await FolderPrivileges.findOne({
                where: {
                    FOLDER_ID: folder_id,
                    user_id
                }
            });

            return res.status(200).json(privileges);
        } catch (error) {
            console.error('Error finding privileges for folder:', error);
        }
    },
};

module.exports = privilegeController;