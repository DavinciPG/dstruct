const db = require('../models');
const Folders = db.folders;
const FolderPrivileges = db.folderprivileges;
const Document = db.documents;
const DocumentPrivileges = db.documentprivileges;
const Users = db.users;

const foldersController = {
    // Create a folder
    async createFolder(req, res) {
        try {
            const { _ID, title, category } = req.body;
            if(!title || title.length <= 0 || title.length >= 30)
                return res.status(400).json({ error: 'Invalid title.' });

            if (_ID !== undefined && _ID !== null)
            {
                const folder = await Folders.findByPk(_ID);
                if(!folder)
                    return res.status(404).json({ error: 'Folder Not Found!' });

                if(folder.user_id !== req.session.user.id) {
                    const privileges = await FolderPrivileges.findOne({
                        where: {
                            FOLDER_ID: _ID,
                            user_id: req.session.user.id,
                            CREATE_PRIVILEGE: true
                        }
                    });

                    if (!privileges)
                        return res.status(403).json({error: 'No Access.'});
                }
            }

            const newFolder = await Folders.create({
                title,
                _ID: _ID || null,
                category: category || 'ÜLDINE',
                user_id: req.session.user.id
            });

            return res.status(201).json(newFolder);
        } catch (error) {
            console.error('Error creating folder:', error);
            return res.status(500).send('Internal Server Error');
        }
    },

    // Get a list of all folders
    async getAllFolders(req, res) {
        try {
            // @note: we are getting folders by THINKING that folderprivileges cannot exist for the user_id... if it exists then duplicate

            const ownedFolders = await Folders.findAll({
                where: {
                    user_id: req.session.user.id
                }
            });

            const foldersWithReadPrivilege = await Folders.findAll({
                include: [{
                    model: FolderPrivileges,
                    as: 'Privileges',
                    where: {
                        user_id: req.session.user.id,
                        READ_PRIVILEGE: true
                    },
                    required: true
                }]
            });

            const folderIDs = new Set();
            const combinedFolders = [...ownedFolders, ...foldersWithReadPrivilege.filter(folder => {
                const isDuplicate = folderIDs.has(folder.ID);
                folderIDs.add(folder.ID);
                return !isDuplicate;
            })];

            return res.json(combinedFolders);
        } catch (error) {
            console.error('Error fetching folders:', error);
            return res.status(500).send('Internal Server Error');
        }
    },

    // Get a single folder by ID
    async getFolderByID(req, res) {
        try {
            const folder = await Folders.findByPk(req.params.id);
            if(!folder)
                return res.status(404).json({ error: 'Folder not found!' });

            if(folder.user_id !== req.session.user.id)
            {
                const privileges = await FolderPrivileges.findOne({
                    where: {
                        FOLDER_ID: req.params.id,
                        user_id: req.session.user.id,
                        READ_PRIVILEGE: true
                    }
                });

                if (!privileges)
                    return res.status(403).json({ error: 'No Access.' });
            }

            return res.json(folder);
        } catch (error) {
            console.error('Error fetching folder:', error);
            return res.status(500).send('Internal Server Error');
        }
    },


    // Get documents by folder
    async getDocumentsByFolderId(req, res) {
        try {
            const folder = await Folders.findByPk(req.params.id);
            if(!folder)
                return res.status(404).json({ error: 'Folder not found!' });

            if(folder.user_id !== req.session.user.id)
            {
                const privileges = await FolderPrivileges.findOne({
                    where: {
                        FOLDER_ID: req.params.id,
                        user_id: req.session.user.id,
                        READ_PRIVILEGE: true
                    }
                });

                if (!privileges)
                    return res.status(403).json({ error: 'No Access.' });
            }

            const documents = await Document.findAll({
                where: {
                    FOLDER_ID: req.params.id
                }
            });

            const docs = [];
            for (const document of documents) {
                if(document.owner_id !== req.session.user.id) {
                    const privileges = await DocumentPrivileges.findOne({
                        where: {
                            READ_PRIVILEGE: true,
                            document_id: document.ID,
                            user_id: req.session.user.id
                        }
                    });

                    if(!privileges)
                        continue;
                }

                docs.push(document);
            }

            return res.status(200).json(docs);
        } catch (error) {
            console.error('Error fetching documents for folder:', error);
            return res.status(500).send('Internal Server Error');
        }
    },

    // Update a folder
    async updateFolder(req, res) {
        try {
            // @note: My 2AM brain cannot seperate this into different endpoints, just save the data in the front and send the same data back if no changes made thanks

            const { title, category } = req.body;
            const folder = await Folders.findByPk(req.params.id);
            if(!folder)
                return res.status(404).json({ error: 'Folder Not Found!' });

            if(folder.user_id !== req.session.user.id)
            {
                const privileges = await FolderPrivileges.findOne({
                    where: {
                        FOLDER_ID: req.params.id,
                        user_id: req.session.user.id,
                        WRITE_PRIVILEGE: true
                    }
                });

                if (!privileges)
                    return res.status(403).json({ error: 'No Access.' });
            }

            await folder.update({
                title,
                category
            });

            return res.status(200).json(folder);
        } catch (error) {
            console.error('Error updating folder:', error);
            return res.status(500).send('Internal Server Error');
        }
    },

    // Delete a folder
    async deleteFolder(req, res) {
        const transaction = await db.sequelize.transaction();

        try {
            const folder = await Folders.findByPk(req.params.id);
            if(!folder)
                return res.status(404).json({ error: 'Folder Not Found!' });

            if(folder.user_id !== req.session.user.id)
            {
                const privileges = await FolderPrivileges.findOne({
                    where: {
                        FOLDER_ID: req.params.id,
                        user_id: req.session.user.id,
                        DELETE_PRIVILEGE: true
                    },
                    transaction
                });

                if (!privileges) {
                    await transaction.rollback();
                    return res.status(403).json({error: 'No Access.'});
                }
            }

            // @note: we don't check for subfolder privileges because why not... user already owns the main folder

            // Find all subfolders
            // eslint-disable-next-line no-inner-declarations
            async function findAllSubFolderIds(folderId, folderIds = new Set(), transaction) {
                const subfolders = await Folders.findAll({
                    where: { _ID: folderId },
                    attributes: ['ID'],
                    transaction
                });

                for (const subfolder of subfolders) {
                    folderIds.add(subfolder.ID);
                    await findAllSubFolderIds(subfolder.ID, folderIds);
                }

                return folderIds;
            }

            const folderIdsToDelete = await findAllSubFolderIds(req.params.id, new Set(), transaction);
            let folderIdsArray = Array.from(folderIdsToDelete);
            folderIdsArray.push(req.params.id);

            const documents = await Document.findAll({
                where: {
                    FOLDER_ID: folderIdsArray
                },
                attributes: ['ID'],
                transaction
            });

            const documentIds = documents.map(doc => doc.ID);

            if (documentIds.length > 0) {
                // Destroy document privileges
                await DocumentPrivileges.destroy({
                    where: {
                        document_id: documentIds
                    },
                    transaction
                });

                await Document.destroy({
                    where: {
                        ID: documentIds
                    },
                    transaction
                });
            }

            // Destroy folder privileges if exist
            await FolderPrivileges.destroy({
                where: {
                    FOLDER_ID: folderIdsArray
                },
                transaction
            });

            // @note: unsafe
            await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });

            // Destroy all folders
            await Folders.destroy({ where: { ID: folderIdsArray }, transaction });

            // @note: imagine above errors, and we don't run this query lol
            await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });

            await transaction.commit();
            return res.status(200).json({ message: 'Folder deleted.' });
        } catch (error) {
            await transaction.rollback();
            console.error('Error deleting folder:', error);
            return res.status(500).send('Internal Server Error');
        }
    },

    async shareFolder(req, res){
        try {
            const folder = await Folders.findByPk(req.params.id);
            if(!folder)
                return res.status(404).json({ error: 'Folder Not Found!' });

            const { email, READ_PRIVILEGE, WRITE_PRIVILEGE, CREATE_PRIVILEGE, DELETE_PRIVILEGE } = req.body;

            if(folder.user_id !== req.session.user.id)
            {
                const privileges = await FolderPrivileges.findOne({
                    where: {
                        FOLDER_ID: req.params.id,
                        user_id: req.session.user.id,
                        READ_PRIVILEGE: true
                    }
                });

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

            const existing_privileges = await FolderPrivileges.findOne({
                where: {
                    FOLDER_ID: req.params.id,
                    user_id: user.ID
                }
            });

            if(existing_privileges)
            {
                await existing_privileges.update({
                    READ_PRIVILEGE,
                    WRITE_PRIVILEGE,
                    CREATE_PRIVILEGE,
                    DELETE_PRIVILEGE
                });

                return res.status(200).json({ message: 'Updated privileges.' });
            }

            await FolderPrivileges.create({
                FOLDER_ID: req.params.id,
                user_id: user.ID,
                READ_PRIVILEGE,
                WRITE_PRIVILEGE,
                CREATE_PRIVILEGE,
                DELETE_PRIVILEGE
            });

            return res.status(200).json({ message: 'Shared folder.' });
        } catch (error) {
            console.error('Error creating/updating folder privileges:', error);
            return res.status(500).send('Internal Server Error');
        }
    },

    async getSharedToFolder(req, res){
        try {
            const folder = await Folders.findByPk(req.params.id);
            if(!folder)
                return res.status(404).json({ error: 'Folder Not Found!' });

            if(folder.user_id !== req.session.user.id)
            {
                const privileges = await FolderPrivileges.findOne({
                    where: {
                        FOLDER_ID: req.params.id,
                        user_id: req.session.user.id,
                        READ_PRIVILEGE: true
                    }
                });

                if (!privileges)
                    return res.status(403).json({ error: 'No Access.' });
            }

            const privileges = await FolderPrivileges.findAll({
                where: {
                    FOLDER_ID: req.params.id
                }
            })

            return res.status(200).json(privileges);
        } catch (error) {
            console.error('Error finding folder privileges:', error);
            return res.status(500).send('Internal Server Error');
        }
    },
};

module.exports = foldersController;