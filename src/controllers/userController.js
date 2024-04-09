const db = require('../models');
const User = db.users;

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const userController = {
    // we get our current session
    async getCurrentSession(req, res) {
        try {
            if(req.session.user)
                return res.status(200).json({ data: req.session.user });

            return res.status(200).json({ error: 'Server has no session saved.' });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).send('Internal Server Error');
        }
    },

    // we get our current session
    async authenticateSession(req, res) {
        try {
            const input_data = {
                email: req.body.email,
                password: req.body.password,

                invalid: function() {
                    const regex = /^[a-zA-Z0-9._%+-]+@voco\.ee$/;
                    if (!this.email || this.email.length === 0 || !regex.test(this.email))
                        return true;

                    // passwords have a limit to characters
                    if (!this.password || this.password.length === 0 || this.password.length >= 80 || this.password.length <= 6)
                        return true;

                    return false;
                }
            };

            if(input_data.invalid())
                return res.status(400).json({ message: 'Bad request.' });

            if(req.session.user)
                return res.status(403).json({ message: 'Session already authenticated.' });

            const user = await User.findOne({
                where: { EMAIL: input_data.email }
            });

            if(!user)
                return res.status(404).json({ error: 'User not found.' });

            const passwordMatch = await bcrypt.compare(input_data.password, user.password);
            if(!passwordMatch)
                return res.status(401).json({ error: 'Authentication Failure.' });

            if(!user.can_access)
                return res.status(401).json({ error: 'User Account Disabled.' });

            const user_client = {
                email: user.EMAIL,
                id: user.ID,
                rank: user.teacher ? 1 : (user.administrator ? 2 : 0),
                can_access: user.can_access
            }

            req.session.user = user_client;

            return res.status(202).json({ message: 'Success.', data: user_client });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).send('Internal Server Error');
        }
    },

    // Destroy current session
    async destroySession(req, res) {
        req.session.destroy((error) => {
            if(error) {
                res.status(500).json({ message: 'Failed to destroy session.' });
                return;
            }

            return res.status(200).json({ message: 'Session destroyed.' });
        });
    },

    // Fetch all users
    async getAllUsers(req, res) {
        try {
            // @todo: limit to administrator
            if(req.session.user.rank !== 2)
                return res.status(401).json({ message: 'User Not Authorized To Access This.' });

            const users = await User.findAll({
                attributes: ['ID', 'EMAIL', 'teacher']
            });

            return res.status(200).json(users);
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).send('Internal Server Error');
        }
    },

    async getAllStudents(req, res) {
        try {
            if(req.session.user.rank === 0 || !req.session.user.can_access)
                return res.status(401).json({ message: 'Unauthorized' });

            const users = await User.findAll({
                where: {
                    teacher: false,
                    administrator: false
                },
                attributes: ['EMAIL', 'can_access']
            });

            return res.status(200).json(users);
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).send('Internal Server Error');
        }
    },

    async addUserByEmail(req, res) {
        try {
            const userEmail = req.body.email;
            const emailRegex = /^[a-zA-Z0-9._%+-]+@voco\.ee$/;
            if (!emailRegex.test(userEmail))
                return res.status(400).json({ error: 'Invalid email format. Email must end with @voco.ee' });

            if(req.session.user.rank === 0 || !req.session.user.can_access || req.session.user.email === userEmail)
                return res.status(401).json({ message: 'Unauthorized.' });

            const user = await User.findOne({
                where: { EMAIL: userEmail },
                attributes: ['ID', 'EMAIL']
            });

            if(user && !user.can_access)
            {
                await user.update({
                    can_access: true
                });

                return res.status(200).json({ message: 'User can now access the webpage.' });
            }

            if(!user)
            {
                const genereated_password = uuidv4();
                const hashed_password = await bcrypt.hash(genereated_password, 12);

                await User.create({
                    EMAIL: userEmail,
                    teacher: false,
                    administrator: false,
                    invited_by: req.session.user.id,
                    password: hashed_password,
                    can_access: true
                });

                return res.status(201).json({ message: `Added user ${userEmail} with password ${genereated_password}` });
            }

            return res.status(400).json({ message: 'User already exists.' });
        } catch (error) {
            console.error('Error finding user by email:', error);
            res.status(500).send('Internal Server Error');
        }
    },
    async removeUserByEmail(req, res) {
        try {
            const userEmail = req.body.email;
            const emailRegex = /^[a-zA-Z0-9._%+-]+@voco\.ee$/;
            if (!emailRegex.test(userEmail))
                return res.status(400).json({ error: 'Invalid email format. Email must end with @voco.ee' });

            if(req.session.user.rank === 0 || !req.session.user.can_access || req.session.user.email === userEmail)
                return res.status(401).json({ message: 'Unauthorized.' });

            const user = await User.findOne({
                where: { EMAIL: userEmail },
                attributes: ['ID', 'EMAIL']
            });

            if(!user || user.administrator)
                return res.status(400).json({ error: 'User does not exist.' });

            // @note: we just revoke usage privileges, would be catastrophic if we just deleted everything right
            await user.update({
               can_access: false
            });

            return res.status(200).json({ message: 'Revoked user privileges to access website.' });
        } catch (error) {
            console.error('Error finding user by email:', error);
            res.status(500).send('Internal Server Error');
        }
    },
    async resetUserPassword(req, res) {
        try {
            const userEmail = req.params.email;
            const emailRegex = /^[a-zA-Z0-9._%+-]+@voco\.ee$/;
            if (!emailRegex.test(userEmail))
                return res.status(400).json({ error: 'Invalid email format. Email must end with @voco.ee' });

            if(req.session.user.rank === 0 || !req.session.user.can_access || req.session.user.email === userEmail)
                return res.status(401).json({ message: 'Unauthorized.' });

            const user = await User.findOne({
                where: { EMAIL: userEmail },
                attributes: ['ID', 'EMAIL']
            });

            if(!user || user.administrator)
                return res.status(400).json({ error: 'User does not exist.' });

            const genereated_password = uuidv4();
            const hashed_password = await bcrypt.hash(genereated_password, 12);

            await user.update({
                password: hashed_password
            });

            // @todo: save who requests password reset and also block deletion of files etc for a bit

            return res.status(200).json({ message: `Reset ${userEmail} password to ${genereated_password}` });
        } catch (error) {
            console.error('Error finding user by email:', error);
            res.status(500).send('Internal Server Error');
        }
    }
};

module.exports = userController;