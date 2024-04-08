const db = require('../models');
const Folders = db.folders;
const FolderPrivileges = db.folderprivileges;
const Users = db.users;

const foldersController = {
    // Create a folder
    async createFolder(req, res) {
        try {
            const { _ID, title, category } = req.body;
            if((title.length <= 0 || title.length >= 30) || (category.length <= 0 || category.length >= 30))
                return res.status(400).json({ error: 'Data invalid.' });

            if (_ID !== undefined && _ID !== null)
            {
                const folder = await Folders.findByPk(_ID);
                if(!folder)
                    return res.status(404).json({ error: 'Folder Not Found!' });

                const privileges = await FolderPrivileges.findOne({
                    where: {
                        FOLDER_ID: _ID,
                        user_id: req.session.user.id,
                        CREATE_PRIVILEGE: true
                    }
                });

                if (!privileges)
                    return res.status(403).json({ error: 'No Access.' });
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
                    }
                });

                if (!privileges)
                    return res.status(403).json({ error: 'No Access.' });
            }

            await Folders.destroy({
                where: { ID: req.params.id }
            });

            return res.status(204).json({ message: 'Folder deleted.' });
        } catch (error) {
            console.error('Error deleting folder:', error);
            return res.status(500).send('Internal Server Error');
        }
    },

    async shareFolder(req, res){
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

            const { email, READ_PRIVILEGE, WRITE_PRIVILEGE, CREATE_PRIVILEGE, DELETE_PRIVILEGE } = req.body;

            // @todo: data validation

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

            return res.status(204).json({ message: 'Shared folder.' });
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

            return res.status(204).json(privileges);
        } catch (error) {
            console.error('Error finding folder privileges:', error);
            return res.status(500).send('Internal Server Error');
        }
    },
};

module.exports = foldersController;