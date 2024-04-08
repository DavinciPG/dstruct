const db = require('../models');
const User = db.users;

const bcrypt = require('bcrypt');

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

            const user_client = {
                email: user.EMAIL,
                id: user.ID,
                rank: user.teacher ? 1 : (user.administrator ? 2 : 0)
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
            const users = await User.findAll();
            res.json(users);
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).send('Internal Server Error');
        }
    },

    // Find a user by email
    async findUserByEmail(req, res) {
        try {
            const userEmail = req.body.email;
            const user = await User.findOne({
                where: { EMAIL: userEmail }
            });
            if (user) {
                res.json(user);
            } else {
                res.status(404).send('User not found');
            }
        } catch (error) {
            console.error('Error finding user by email:', error);
            res.status(500).send('Internal Server Error');
        }
    },
};

module.exports = userController;