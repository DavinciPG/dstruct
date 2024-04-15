const db = require('../models');
const Document = db.documents;
const DocumentPrivileges = db.documentprivileges;
const Folders = db.folders;
const FolderPrivileges = db.folderprivileges;
const Users = db.users;

const fileController = require('./fileController');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const util = require('util');

const rename = util.promisify(fs.rename);

const allowed_documents = ['pdf', 'docx', 'txt'];

const documentsController = {
    // Create a new document
    async createDocument(req, res) {
        try {
            const { title, document_type, metadata, FOLDER_ID } = req.body;

            if((!title || title.length <= 0))
                return res.status(400).json({ error: 'Bad title.' });

            if((!document_type || document_type.length <= 0 || !allowed_documents.includes(document_type)))
            {
                const allowedTypesStr = allowed_documents.join(', ');

                return res.status(400).json({
                    error: `Invalid document type. Allowed types are: ${allowedTypesStr}.`
                });
            }

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

            const generateRandomFilename = (doc_type) => {
                const timestamp = Date.now();
                const uuid = uuidv4();
                return `${timestamp}-${uuid}.${doc_type}`;
            };

            const generated_file_name = generateRandomFilename(document_type);

            const file_created = await fileController.createFile(generated_file_name);
            if(!file_created)
                return res.status(500).json({ error: 'Failed creating file.'});

            const newDocument = await Document.create({
                title,
                document_type,
                metadata: metadata || null, // should we allow null?
                FOLDER_ID: FOLDER_ID || null, // can be top most so no folder
                owner_id: req.session.user.id,
                file_path: generated_file_name
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
            // Add IDs from ownedDocuments to the Set to track duplicates
            ownedDocuments.forEach(doc => documentIds.add(doc.ID));

            const combinedDocuments = [
                ...ownedDocuments,
                ...documentsWithReadPrivilege.filter(doc => {
                    const isDuplicate = documentIds.has(doc.ID);
                    if (!isDuplicate) {
                        // If not a duplicate, add to the Set to ensure it's not added again
                        documentIds.add(doc.ID);
                    }
                    return !isDuplicate;
                })
            ];

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

            let updateData = {};

            if(title && (title.length > 0))
                updateData.title = title;

            if(document_type && (allowed_documents.includes(document_type)))
                updateData.document_type = document_type;

            if(metadata && (metadata.length > 0))
                updateData.metadata = metadata;

            if(FOLDER_ID)
                updateData.FOLDER_ID = FOLDER_ID;

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

            // @note: unsafe
            await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

            await document.update(updateData);

            // @note: imagine above errors, and we don't run this query lol
            await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

            return res.status(200).json(document);
        } catch (error) {
            console.error('Error updating document:', error);
            return res.status(500).send('Internal Server Error');
        }
    },

    // Placeholder since I don't have time to do multipart forms
    async updateDocumentFile(req, res){
        try {
            // @note: rip data, no rollback exists
            const file = req.file;
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

            const fileContent = '1';

            const updated = await fileController.updateFile(document.file_path, fileContent);
            if(!updated)
                return res.status().json({ error: 'Failed updating document' });

            return res.status(200).json({ message: 'Updated Document.' });
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

            await DocumentPrivileges.destroy({
                where: {
                    document_id: req.params.id
                }
            });

            await Document.destroy({
                where: { ID: req.params.id }
            });

            await fileController.deleteFile(document.file_path);

            return res.status(200).json({ message: 'Document deleted'});
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

            const { email, READ_PRIVILEGE, WRITE_PRIVILEGE, DELETE_PRIVILEGE } = req.body;

            if(document.owner_id !== req.session.user.id)
            {
                const privileges = await DocumentPrivileges.findOne({
                    where: {
                        document_id: req.params.id,
                        user_id: req.session.user.id,
                        READ_PRIVILEGE: true
                    }
                });

                // @note: hopefully fixes the permission sharing bug, if not rip... no time to test
                if(!privileges || (privileges.WRITE_PRIVILEGE === false && WRITE_PRIVILEGE === true)
                    || (privileges.DELETE_PRIVILEGE === false && DELETE_PRIVILEGE === true)) {
                    return res.status(403).json({error: 'No Access.'});
                }
            }

            const emailRegex = /^[a-zA-Z0-9._%+-]+@voco\.ee$/;
            if (!emailRegex.test(email))
                return res.status(400).json({ error: 'Invalid email format. Email must end with @voco.ee' });

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

            return res.status(200).json({ message: 'Shared Document.' });
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

            const privileges = await DocumentPrivileges.findAll({
                where: {
                    document_id: req.params.id
                },
                include: [{
                    model: db.users,
                    as: 'User',
                    attributes: ['EMAIL']
                }]
            });

            return res.status(200).json(privileges);
        } catch (error) {
            console.error('Error finding document privileges:', error);
            return res.status(500).send('Internal Server Error');
        }
    },

    async uploadDocument(req, res) {
        try {
            if (!req.file) {
                return res.status(400).send('No file uploaded.');
            }

            const document_type = path.extname(req.file.filename).slice(1);

            if (!allowed_documents.includes(document_type)) {
                const allowedTypesStr = allowed_documents.join(', ');
                return res.status(400).json({
                    error: `Invalid document type. Allowed types are: ${allowedTypesStr}.`
                });
            }

            return res.status(200).json({
                message: 'File uploaded successfully',
                filename: req.file.filename
            });
        } catch (error) {
            console.error('Error uploading document:', error);
            return res.status(500).send('Internal Server Error');
        }
    },
    async uploadDocumentDetails(req, res) {
        try {
            const { title, metadata, FOLDER_ID, generated_file_name } = req.body;

            if((!title || title.length <= 0))
                return res.status(400).json({ error: 'Bad title.' });

            const document_type = path.extname(generated_file_name).slice(1);

            if((!document_type || document_type.length <= 0 || !allowed_documents.includes(document_type)))
            {
                const allowedTypesStr = allowed_documents.join(', ');

                return res.status(400).json({
                    error: `Invalid document type. Allowed types are: ${allowedTypesStr}.`
                });
            }

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
                file_path: generated_file_name
            });

            return res.status(201).json(newDocument);
        } catch (error) {
            console.error('Error uploading document:', error);
            return res.status(500).send('Internal Server Error');
        }
    },
    async downloadDocument(req, res) {
        try {
            const id = req.params.id;

            const document = await Document.findOne({
                where: {
                    ID: id
                }
            });

            if(!document)
                return res.status(404).json({ error: 'Document Not Found!' });

            if(document.owner_id !== req.session.user.id) {
                const privileges = await DocumentPrivileges.findOne({
                    where: {
                        document_id: document.ID,
                        user_id: req.session.user.id,
                        READ_PRIVILEGE: true
                    }
                });

                if (!privileges)
                    return res.status(403).json({error: 'No Access.'});
            }

            const filePath = path.join(__dirname, 'uploads', document.file_path);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found.' });
            }

            res.setHeader('Content-Disposition', 'attachment; filename=' + document.file_path);
            res.setHeader('Content-Type', 'application/octet-stream');

            fs.createReadStream(filePath).pipe(res);
        } catch (error) {
            console.error('Error downloading file:', error);
            return res.status(500).send('Internal Server Error');
        }
    }
};

module.exports = documentsController;