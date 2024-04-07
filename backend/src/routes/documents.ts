import bcrypt from 'bcrypt';
import { Request, Response, Router } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/config';
import pool from '../config/database';

const router = Router();

router.get('/documents', async (req: Request, res: Response) => {
    let connection;
    try {
        connection = await pool.getConnection();

        if(!req.session.user) {
            res.status(401).json({ message: 'User not logged in.' });
            return;
        }

        const user_id = req.session.user.id;
        const sql_query = `
            SELECT 
                d.ID, 
                d.title AS TITLE, 
                d.document_type, 
                d.metadata, 
                d.owner_id AS OWNER_ID, 
                d.folder_id,
                dp.READ_PRIVILEEG 
            FROM 
                documents d 
            LEFT JOIN 
                document_privileges dp 
            ON 
                dp.document_id = d.ID 
                AND dp.user_id = ?
            WHERE 
                 d.FOLDER_ID IS NULL 
                 AND (d.owner_id = ? OR dp.READ_PRIVILEEG = 1);
        `;
        const [rows] = await connection.query<RowDataPacket[]>(sql_query, [user_id, user_id]);

        return res.status(202).json({ message: 'Success.', data: rows});
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        if(connection) {
            connection.release();
        }
    }
});

router.get('/folders/:id/documents', async (req: Request, res: Response) => {
    let connection;
    try {
        connection = await pool.getConnection();

        if(!req.session.user) {
            res.status(401).json({ message: 'User not logged in.' });
            return;
        }

        const folder_id = req.params.id

        const user_id = req.session.user.id;
        const sql_query = `
            SELECT 
                d.ID, 
                d.title AS TITLE, 
                d.document_type, 
                d.metadata, 
                d.owner_id AS OWNER_ID, 
                d.folder_id,
                dp.READ_PRIVILEEG 
            FROM 
                documents d 
            LEFT JOIN 
                document_privileges dp 
            ON 
                dp.document_id = d.ID 
                AND dp.user_id = ?
            WHERE 
                 d.FOLDER_ID = ? 
                 AND (d.owner_id = ? OR dp.READ_PRIVILEEG = 1);
        `;
        const [rows] = await connection.query<RowDataPacket[]>(sql_query, [user_id, folder_id, user_id]);

        return res.status(202).json({ message: 'Success.', data: rows});
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
// RETURN: RETURNS ALL FOLDERS FOR USER
router.get('/documents/:id', async (req: Request, res: Response) => {
    let connection;
    try {
        connection = await pool.getConnection();

        if(!req.session.user) {
            res.status(401).json({ message: 'User not logged in.' });
            return;
        }

        const sql_query = 'SELECT d.ID, d.title, d.document_type, d.metadata, d.owner_id AS OWNER_ID, dp.READ_PRIVILEEG FROM documents d LEFT JOIN document_privileges dp on dp.document_id = ? AND dp.user_id = ? WHERE d.ID = ?;';
        const [rows] = await connection.query<RowDataPacket[]>(sql_query, [req.params.id, req.session.user.id, req.session.user.id]);

        if(rows.length > 0 && (rows[0].OWNER_ID === req.session.user.id || rows[0].READ_PRIVILEEG === true))
            return res.status(202).json({ message: 'Success.', data: rows});

        return res.status(401).json({ message: 'No Access.' });
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
// RETURN: CREATES NEW DOCUMENT
router.put('/documents', async (req: Request, res: Response) => {
    let connection;
    try {
        connection = await pool.getConnection();

        const { folder_id, title, document_type } = req.body;
        if(title.length <= 0)
        {
            res.status(401).json({ message: 'Invalid data.' });
            return;
        }

        if(!req.session.user) {
            res.status(401).json({ message: 'User not logged in.' });
            return;
        }

        if (!allowedDocumentTypes.includes(document_type)) {
            res.status(400).json({ message: `The document_type '${document_type}' is not allowed. Allowed types are: ${allowedDocumentTypes.join(', ')}.` });
            return;
        }

        // @todo: check if user has access to create documents in folder

        const sql_query = 'INSERT INTO documents(folder_id, owner_id, document_type, title) VALUES(?, ?, ?, ?)';
        const [result] = await connection.query<ResultSetHeader>(sql_query, [folder_id || null, req.session.user.id, document_type, title]);

        // @todo: make a file

        if (result.affectedRows <= 0) {
            throw new Error('Failed inserting document');
        }

        return res.status(201).json({ message: 'Success.', data: rows });
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
// RETURN: RETURNS ALL FOLDERS FOR USER
router.delete('/documents/:id', async (req: Request, res: Response) => {
    let connection;
    try {
        connection = await pool.getConnection();

        if(!req.session.user) {
            res.status(401).json({ message: 'User not logged in.' });
            return;
        }

        const document_id = req.params.id;

        const privilege_query = 'SELECT d.ID, d.owner_id AS OWNER_ID, dp.DELETE_PRIVILEEG FROM documents d LEFT JOIN document_privileges dp on dp.document_id = ? AND dp.user_id = ? WHERE d.ID = ?;';
        const [privilege_rows] = await connection.query<RowDataPacket[]>(privilege_query, [document_id, req.session.user.id, document_id]);

        if(privilege_rows.length <= 0)
        {
            res.status(404).json({ message: 'Invalid data.' });
            return;
        }

        if(privilege_rows[0].OWNER_ID != req.session.user.id && !privilege_rows[0].DELETE_PRIVILEEG)
        {
            res.status(404).json({ message: 'Insufficient privileges.' });
            return;
        }

        // @todo: restore state
        // recycle bin, 7d timeout?
        /*
        We have a class inside backend called RecyclyingBin, we keep backend alive and every info about items inside a text and current proccess
        Upon launching backend we read the data and make a backup. We keep track of each item then we delete them when time comes around. We can revert the item during the 'time'
        */

        // @note: all this works by assuming that the owner of the folder SHOULD own DELETE_PRIVILEGE for everything under the folder

        const delete_doc = 'DELETE FROM documents WHERE ID=?';
        await connection.query<RowDataPacket[]>(delete_doc, [document_id]);

        return res.status(200).json({ message: 'Success.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        if(connection) {
            connection.release();
        }
    }
});

router.get('/documents/:id/share', async (req: Request, res: Response) => {
    let connection;
    try {
        connection = await pool.getConnection();

        if(!req.session.user) {
            res.status(401).json({ message: 'User not logged in.' });
            return;
        }

        const document_id = req.params.id;

        const sql = 'SELECT u.EMAIL, dp.READ_PRIVILEEG, dp.WRITE_PRIVILEEG, dp.DELETE_PRIVILEEG FROM users u JOIN document_privileges dp ON u.ID = dp.user_id JOIN documents d ON dp.document_id = d.ID WHERE d.ID = ?;';
        const [rows] = await connection.query<RowDataPacket[]>(sql, [document_id]);

        return res.status(200).json({ message: 'Success.', data: rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        if(connection) {
            connection.release();
        }
    }
});

router.post('/documents/:id/share', async (req: Request, res: Response) => {
    let connection;
    try {
        connection = await pool.getConnection();

        if(!req.session.user) {
            res.status(401).json({ message: 'User not logged in.' });
            return;
        }

        const document_id = req.params.id;
        const { read_privilege, write_privilege, delete_privilege } = req.body;

        const owner_sql = 'SELECT d.owner_id FROM documents d WHERE ID = ?;';
        const [owner_rows] = await connection.query<RowDataPacket[]>(owner_sql, [document_id]);
        if(owner_rows.length === 0 && (owner_rows[0].owner_id !== req.session.user.id))
            return res.status(401).json({ message: 'No access.' });

        const sql = 'INSERT INTO document_privileges (document_id, READ_PRIVILEEG, WRITE_PRIVILEEG, DELETE_PRIVILEEG) VALUES (?, ?, ?, ?);';
        await connection.query(sql, [document_id, read_privilege || false, write_privilege || false, delete_privilege || false]);

        return res.status(200).json({ message: 'Success.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        if(connection) {
            connection.release();
        }
    }
});

router.post('/documents/:id/title', async (req: Request, res: Response) => {
    let connection;
    try {
        connection = await pool.getConnection();

        if(!req.session.user) {
            res.status(401).json({ message: 'User not logged in.' });
            return;
        }

        const document_id = req.params.id;
        const { new_title } = req.body;

        // @todo: allow users with write to change title

        const owner_sql = 'SELECT d.owner_id FROM documents d WHERE ID = ?;';
        const [owner_rows] = await connection.query<RowDataPacket[]>(owner_sql, [document_id]);
        if(owner_rows.length === 0 && (owner_rows[0].owner_id !== req.session.user.id))
            return res.status(401).json({ message: 'No access.' });

        const sql = 'UPDATE documents SET title = ? WHERE ID = ?;';
        await connection.query(sql, [new_title, document_id]);

        return res.status(200).json({ message: 'Success.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        if(connection) {
            connection.release();
        }
    }
});

router.post('/documents/:id/metadata', async (req: Request, res: Response) => {
    let connection;
    try {
        connection = await pool.getConnection();

        if(!req.session.user) {
            res.status(401).json({ message: 'User not logged in.' });
            return;
        }

        const document_id = req.params.id;
        const { new_metadata } = req.body;

        // @todo: allow users with write to change title

        const owner_sql = 'SELECT d.owner_id FROM documents d WHERE ID = ?;';
        const [owner_rows] = await connection.query<RowDataPacket[]>(owner_sql, [document_id]);
        if(owner_rows.length === 0 && (owner_rows[0].owner_id !== req.session.user.id))
            return res.status(401).json({ message: 'No access.' });

        const sql = 'UPDATE documents SET metadata = ? WHERE ID = ?;';
        await connection.query(sql, [new_metadata, document_id]);

        return res.status(200).json({ message: 'Success.' });
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