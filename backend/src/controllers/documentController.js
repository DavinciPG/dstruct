const db = require('../models');
const Document = db.documents;
const DocumentPrivileges = db.documentprivileges;
const Folders = db.folders;
const FolderPrivileges = db.folderprivileges;
const Users = db.users;

const documentsController = {
    // Create a new document
    async createDocument(req, res) {
        try {
            const { title, document_type, metadata, FOLDER_ID } = req.body;

            // @todo: data validation
            // @todo: create the actual file, associate file_path

            if (FOLDER_ID !== undefined && FOLDER_ID !== null)
            {
                const folder = await Folders.findByPk(FOLDER_ID);
                if(!folder)
                    return res.status(404).json({ error: 'Folder Not Found!' });

                if(folder.user_id !== req.session.user.id) {
                    const privileges = await FolderPrivileges.findOne({
                        where: {
                            FOLDER_ID,
                            user_id: req.session.user.id,
                            CREATE_PRIVILEGE: true
                        }
                    });

                    if (!privileges)
                        return res.status(403).json({error: 'No Access.'});
                }
            }

            const newDocument = await Document.create({
                title,
                document_type,
                metadata: metadata || null, // should we allow null?
                FOLDER_ID: FOLDER_ID || null, // can be top most so no folder
                owner_id: req.session.user.id,
                file_path: '/1'
            });

            return res.status(201).json(newDocument);
        } catch (error) {
            console.error('Error creating document:', error);
            return res.status(500).send('Internal Server Error');
        }
    },

    // Get a list of all documents
    async getAllDocuments(req, res) {
        try {
            // @note: we are getting documents by THINKING that documentprivileges cannot exist for the owner_id... if it exists then duplicate

            const ownedDocuments = await Document.findAll({
                where: {
                    owner_id: req.session.user.id
                }
            });

            const documentsWithReadPrivilege = await Document.findAll({
                include: [{
                    model: DocumentPrivileges,
                    as: 'Privileges',
                    where: {
                        user_id: req.session.user.id,
                        READ_PRIVILEGE: true
                    },
                    required: true
                }]
            });

            const documentIds = new Set();
            const combinedDocuments = [...ownedDocuments, ...documentsWithReadPrivilege.filter(doc => {
                const isDuplicate = documentIds.has(doc.ID);
                documentIds.add(doc.ID);
                return !isDuplicate;
            })];

            return res.json(combinedDocuments);
        } catch (error) {
            console.error('Error fetching documents:', error);
            return res.status(500).send('Internal Server Error');
        }
    },

    // Get a single document by ID
    async getDocumentById(req, res) {
        try {
            const document = await Document.findByPk(req.params.id);
            if(!document)
                return res.status(404).json({ error: 'Document not found!' });

            if(document.owner_id !== req.session.user.id)
            {
                const privileges = await DocumentPrivileges.findOne({
                    where: {
                        document_id: req.params.id,
                        user_id: req.session.user.id,
                        READ_PRIVILEGE: true
                    }
                });

                if (!privileges)
                    return res.status(403).json({ error: 'No Access.' });
            }

            return res.json(document);
        } catch (error) {
            console.error('Error fetching document:', error);
            return res.status(500).send('Internal Server Error');
        }
    },

    // Update a document
    async updateDocument(req, res) {
        try {
            // @note: My 2AM brain cannot seperate this into different endpoints, just save the data in the front and send the same data back if no changes made thanks
            const { title, document_type, metadata, FOLDER_ID } = req.body;
            const document = await Document.findByPk(req.params.id);
            if(!document)
                return res.status(404).json({ error: 'Document Not Found!' });

            if(document.owner_id !== req.session.user.id)
            {
                const privileges = await DocumentPrivileges.findOne({
                    where: {
                        document_id: req.params.id,
                        user_id: req.session.user.id,
                        WRITE_PRIVILEGE: true
                    }
                });

                if (!privileges)
                    return res.status(403).json({ error: 'No Access.' });
            }

            await document.update({
                title,
                document_type,
                metadata,
                FOLDER_ID
            });

            return res.status(200).json(document);
        } catch (error) {
            console.error('Error updating document:', error);
            return res.status(500).send('Internal Server Error');
        }
    },

    // Delete a document
    async deleteDocument(req, res) {
        try {
            const document = await Document.findByPk(req.params.id);
            if(!document)
                return res.status(404).json({ error: 'Document Not Found!' });

            if(document.owner_id !== req.session.user.id)
            {
                const privileges = await DocumentPrivileges.findOne({
                    where: {
                        document_id: req.params.id,
                        user_id: req.session.user.id,
                        DELETE_PRIVILEGE: true
                    }
                });

                if (!privileges)
                    return res.status(403).json({ error: 'No Access.' });
            }

            await Document.destroy({
                where: { ID: req.params.id }
            });

            return res.status(204).json({ message: 'Document deleted'});
        } catch (error) {
            console.error('Error deleting document:', error);
            return res.status(500).send('Internal Server Error');
        }
    },

    async shareDocument(req, res){
        try {
            const document = await Document.findByPk(req.params.id);
            if(!document)
                return res.status(404).json({ error: 'Document Not Found!' });

            if(document.user_id !== req.session.user.id)
            {
                const privileges = await DocumentPrivileges.findOne({
                    where: {
                        document_id: req.params.id,
                        user_id: req.session.user.id,
                        READ_PRIVILEGE: true
                    }
                });

                if (!privileges)
                    return res.status(403).json({ error: 'No Access.' });
            }

            const { email, READ_PRIVILEGE, WRITE_PRIVILEGE, DELETE_PRIVILEGE } = req.body;

            // @todo: data validation

            const user = await Users.findOne({
                where: {
                    EMAIL: email
                }
            });

            if(!user)
                return res.status(404).json({ error: 'User Not Found!' });

            const existing_privileges = await DocumentPrivileges.findOne({
                where: {
                    document_id: req.params.id,
                    user_id: user.ID
                }
            });

            if(existing_privileges)
            {
                await existing_privileges.update({
                    READ_PRIVILEGE,
                    WRITE_PRIVILEGE,
                    DELETE_PRIVILEGE
                });

                return res.status(200).json({ message: 'Updated privileges.' });
            }

            await DocumentPrivileges.create({
                document_id: req.params.id,
                user_id: user.ID,
                READ_PRIVILEGE,
                WRITE_PRIVILEGE,
                DELETE_PRIVILEGE
            });

            return res.status(204).json({ message: 'Shared Document.' });
        } catch (error) {
            console.error('Error creating/updating document privileges:', error);
            return res.status(500).send('Internal Server Error');
        }
    },

    async getSharedToDocument(req, res){
        try {
            const document = await Document.findByPk(req.params.id);
            if(!document)
                return res.status(404).json({ error: 'Document Not Found!' });

            if(document.user_id !== req.session.user.id)
            {
                const privileges = await DocumentPrivileges.findOne({
                    where: {
                        document_id: req.params.id,
                        user_id: req.session.user.id,
                        READ_PRIVILEGE: true
                    }
                });

                if (!privileges)
                    return res.status(403).json({ error: 'No Access.' });
            }

            const privileges = await DocumentPrivileges.findAll({
                where: {
                    document_id: req.params.id
                }
            })

            return res.status(204).json(privileges);
        } catch (error) {
            console.error('Error finding document privileges:', error);
            return res.status(500).send('Internal Server Error');
        }
    }
};

module.exports = documentsController;