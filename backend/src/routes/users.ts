import bcrypt from 'bcrypt';
import { Request, Response, Router } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/config';
import pool from '../config/database';
import sendMail from '../helpers/mail';

const router = Router();

// todo: server reset = verifiedQueue wiped fix (file, db)
const verifiedQueue = new Map<number, { token: string, expiration: Date }>();
const active_users = new Map<number, { email: string, picture: string}>();

async function clearExpiredTokens() {
    setTimeout(() => {
        for (const [key, value] of verifiedQueue.entries()) {
            if (value.expiration.getTime() < Date.now()) {
                verifiedQueue.delete(key);
            }
        }
    }, 60 * 60 * 1000 * 3);
}

// TYPE: GET
// REQUIREMENT: NONE
// RETURN: RETURNS ALL ONLINE USERS
router.get('/users', async (req: Request, res: Response) => {
    let connection;
    try {
        connection = await pool.getConnection();

        if(!req.session.user) {
            res.status(401).json({ message: 'User not logged in.' });
            return;
        }

        if(req.session.user.rank === 1) { // rank 1 = User
            res.status(401).json({ message: 'Not enough privileges.' });
            return;
        }

        // get from active_users map

        return res.status(200).json({ message: 'Success.', data: {} });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        if(connection) {
            connection.release();
        }
    }
});

function get_token(toFindToken : string) {
    for(const [key, value] of verifiedQueue) {
        if(value.token === toFindToken) {
            return { key, value };
        }
    }
    return null;
}

// TYPE: GET
// REQUIREMENT: NONE
// RETURN: VERIFY ACCOUNT STATUS
router.get('/verify/:token', async (req: Request, res: Response) => {
    let connection;
    try {
        connection = await pool.getConnection();

        const token = req.params.token;

        // added function get_token to lower code count inside route
        const item = get_token(token);
        if(!item) {
            res.status(404).json({ message: 'Token not found.' });
            return;
        }

        // sanity check because we do not filter tokens automatically
        if (item.value.expiration.getTime() < Date.now()) {
            verifiedQueue.delete(item.key);
            // new token/link is generated from /login route
            res.status(404).json({ message: 'Token expired.' });
            return;
        }

        const sql_query = 'UPDATE kasutaja SET verified=1 WHERE id=?';
        const [rows] = await connection.query<RowDataPacket[]>(sql_query, [item.key]);

        // should never be true
        if(!rows || rows.affectedRows === 0) {
            res.status(500).json({ message: 'User not found.' });
            console.warn(`Token exists but user does not exist. ${item}`);
            return;
        }

        // delete the token from the Map
        verifiedQueue.delete(item.key);

        res.status(200).json({ message: 'Account activated.' });
        return;
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        if(connection) {
            connection.release();
        }
    }
});

router.post('/verify', async (req: Request, res: Response) => {
    let connection;
    try {
        connection = await pool.getConnection();

        const token = req.params.token;

        // added function (get_token) to lower code count inside route
        const item = get_token(token);
        if(!item) {
            res.status(404).json({ message: 'Token not found.' });
            return;
        }

        // sanity check because we do not filter tokens automatically
        if (item.value.expiration.getTime() < Date.now()) {
            verifiedQueue.delete(item.key);
            // new token/link is generated from /login route
            res.status(404).json({ message: 'Token expired.' });
            return;
        }

        const sql_query = 'UPDATE kasutaja SET verified=1 WHERE id=?';
        const [rows] = await connection.query<RowDataPacket[]>(sql_query, [item.key]);

        // should never be true
        if(!rows || rows.affectedRows === 0) {
            res.status(500).json({ message: 'User not found.' });
            console.warn(`Token exists but user does not exist. ${item}`);
            return;
        }

        // delete the token from the Map
        verifiedQueue.delete(item.key);

        res.status(200).json({ message: 'Account activated.' });
        return;
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        if(connection) {
            connection.release();
        }
    }
});

// TYPE: POST
// REQUIREMENT: NONE
// RETURN: LOGIN ROUTE
router.post('/sessions', async (req: Request, res: Response) => {
    let connection;
    try {
        connection = await pool.getConnection();

        if(!config.user_accounts) {
            res.status(503).json({ message: 'Service temporarily disabled.' });
            return;
        }

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

        if(input_data.invalid()) {
            res.status(400).json({ message: 'Bad request.' });
            return;
        }

        if(req.session.user) {
            res.status(409).json({ message: 'User already logged in.' });
            return;
        }

        const sql_query = 'SELECT id, email, password, verified, teacher, administrator FROM users WHERE email=?';
        const [rows] = await connection.query<RowDataPacket[]>(sql_query, [input_data.email]);

        if(!rows || rows.length === 0 || rows.length > 1) {
            res.status(500).json({ message: 'User not found.' });
            return;
        }

        const same_pass = await bcrypt.compare(input_data.password, rows[0].password);
        if(!same_pass) {
            res.status(401).json({ message: 'Bad password.' });
            return;
        }

        if(!rows[0].verified) {
            let token = verifiedQueue.get(rows[0].id);
            const newToken = uuidv4();
            const expiration = new Date(Date.now() + 3 * 60 * 60 * 1000); // +3 hours current time
            if(token) {
                // email was already sent but account was not verified

                // only send a new token when the current token has expired
                if (token.expiration.getTime() < Date.now()) {
                    verifiedQueue.delete(rows[0].id);
                    verifiedQueue.set(rows[0].id, { token: newToken, expiration });
                }
            } else {
                // verified email was never sent for some reason or expired
                verifiedQueue.set(rows[0].id, { token: newToken, expiration });
            }

            res.status(403).json({ message: 'Account not verified. Check your email.' });
            return;
        }

        const user = {
            email: rows[0].email,
            id: rows[0].id,
            rank: rows[0].opetaja ? 1 : (rows[0].administraator ? 2 : 0)
        }

        req.session.user = user;
        // todo: insert into active_users table that user logged on. Data sent would be email, no need for uid as email is unique.

        // logging information when we are not in production
        if(!config.production) {
            console.log(`UID: ${user.id} logged in at ${Date.now()}`);
        }

        return res.status(202).json({ message: 'Logged in.', data: {
                id: user.id,
                email: user.email
            }});
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        if(connection) {
            connection.release();
        }
    }
});

// TYPE: PUT
// REQUIREMENT: NONE
// RETURN: REGISTER ROUTE
router.put('/users', async (req: Request, res: Response) => {
    let connection;
    try {
        connection = await pool.getConnection();

        if(!config.user_accounts) {
            res.status(503).json({ message: 'Service temporarily disabled.' });
            return;
        }

        const input_data = {
            email: req.body.email,
            password: req.body.password,

            invalid: function() {
                // passwords have a limit to characters
                if (!this.password || this.password.length === 0 || this.password.length >= 80 || this.password.length <=6)
                    return true;

                const regex = /^[a-zA-Z0-9._%+-]+@voco\.ee$/;
                if (this.email.length === 0 || !regex.test(this.email))
                    return true;

                return false;
            }
        };

        if(input_data.invalid()) {
            res.status(400).json({ message: 'Bad request.' });
            return;
        }

        if(req.session.user) {
            res.status(409).json({ message: 'User already logged in.' });
            return;
        }

        const salt = await bcrypt.genSalt(12);
        const hashed_pass = await bcrypt.hash(input_data.password, salt);

        const sql_query = 'INSERT INTO users (email, password) VALUES (?, ?);';
        const [rows] = await connection.query<RowDataPacket[]>(sql_query, [input_data.email, hashed_pass]);

        if(!rows || rows.affectedRows === 0) {
            res.status(500).json({ message: 'Failed inserting user.' });
            return;
        }

        const newToken = uuidv4();
        const expiration = new Date(Date.now() + 3 * 60 * 60 * 1000); // +3 hours current time
        verifiedQueue.set(rows[0].id, { token: newToken, expiration });

        // send mail to user with token
        const link = `${config.ip}/api/verify/${newToken}`;
        const mailOptions = {
            from: config.email,
            to: input_data.email,
            subject: 'DStruct Account Confirmation',
            text: `Activate your account from the following link: ${link}`
        };

        sendMail(mailOptions);

        // logging information when we are not in production
        if(!config.production) {
            console.log(`UID: ${rows[0].id} registered at ${Date.now()}`);
        }

        return res.status(202).json({ message: 'Registered user.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        if(connection) {
            connection.release();
        }
    }
});

// TYPE: GET
// REQUIREMENT: NONE
// RETURN: RETURNS CURRENT SESSION
router.get('/sessions', async (req: Request, res: Response) => {
    let connection;
    try {
        connection = await pool.getConnection();

        const session = req.session.user;
        if(!session) {
            // we send 200 because the response we get is still okay
            res.status(200).json({ message: 'User not logged in.' });
            return;
        }

        return res.status(200).json({ message: 'Success.', data: {
                id: session.id,
                email: session.email
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        if(connection) {
            connection.release();
        }
    }
});

// TYPE: DELETE
// REQUIREMENT: NONE
// RETURN: DESTROYS CURRENT SESSION
router.delete('/sessions', async (req: Request, res: Response) => {
    let connection;
    try {
        connection = await pool.getConnection();

        if(req.session.user) {
            active_users.delete(req.session.user.id);
        }

        req.session.destroy( async(error) => {
           if(error) {
               res.status(500).json({ message: 'Failed to destroy session.' });
               return;
           }

           return res.status(200).json({ message: 'Session destroyed.' });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        if(connection) {
            connection.release();
        }
    }
});


export default router;