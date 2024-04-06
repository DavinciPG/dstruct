import bcrypt from 'bcrypt';
import { Request, Response, Router } from 'express';
import {PoolConnection, RowDataPacket} from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/config';
import pool from '../config/database';
import sendMail from '../helpers/mail';

const router = Router();

// TYPE: GET
// REQUIREMENT: NONE
// RETURN: RETURNS ALL FOLDERS FOR USER
router.get('/folders', async (req: Request, res: Response) => {
    let connection;
    try {
        connection = await pool.getConnection();

        if(!req.session.user) {
            res.status(401).json({ message: 'User not logged in.' });
            return;
        }

        const sql_query = 'SELECT f.ID, f._ID, f.TITLE, f.CATEGORY FROM folders f LEFT JOIN folder_privileges fp ON f.ID = fp.FOLDER_ID WHERE (f.user_id = ? OR (fp.USER_ID = ? AND fp.READ_PRIVILEGE = TRUE))';
        const [rows] = await connection.query<RowDataPacket[]>(sql_query, [req.session.user.id, req.session.user.id]);

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

// TYPE: PUT
// REQUIREMENT: NONE
// RETURN: CREATES NEW FOLDER
router.put('/folders', async (req: Request, res: Response) => {
    let connection;
    try {
        connection = await pool.getConnection();

        const { _ID, title, category } = req.body;
        if(title.length <= 0)
        {
            res.status(401).json({ message: 'Invalid data.' });
            return;
        }

        if(!req.session.user) {
            res.status(401).json({ message: 'User not logged in.' });
            return;
        }

        const sql_query = 'INSERT INTO folders(_ID, user_id, title, category) VALUES(?, ?, ?, ?)';
        const [rows] = await connection.query<RowDataPacket[]>(sql_query, [_ID || null, req.session.user.id, title, category || 'ÜLDINE']);

        if(rows.length <= 0) {
            throw Error('Failed inserting folder');
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
router.delete('/folders/:id', async (req: Request, res: Response) => {
    let connection;
    try {
        connection = await pool.getConnection();

        if(!req.session.user) {
            res.status(401).json({ message: 'User not logged in.' });
            return;
        }

        const folder_id = req.params.id;

        const privilege_query = 'SELECT f.user_id AS OWNER_ID, fp.DELETE_PRIVILEGE FROM folders f LEFT JOIN folder_privileges fp on fp.FOLDER_ID = ? AND fp.user_id = ? WHERE f.ID = ?';
        const [privilege_rows] = await connection.query<RowDataPacket[]>(privilege_query, [folder_id, req.session.user.id, folder_id]);

        if(privilege_rows.length <= 0)
        {
            res.status(404).json({ message: 'Invalid data.' });
            return;
        }

        if(privilege_rows[0].OWNER_ID != req.session.user.id && !privilege_rows[0].DELETE_PRIVILEGE)
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

        // Recursive function to delete folders, documents, and their privileges
        async function deleteFolderAndContents(folderId: string, connection: PoolConnection) {
            console.log('Deleting folder with id ', folderId);
            // Find all subfolders
            const [subFolders] = await connection.query<RowDataPacket[]>('SELECT ID FROM folders WHERE _ID = ?', [folderId]);
            for (const subFolder of subFolders) {
                await deleteFolderAndContents(subFolder.ID, connection); // Recursively delete subfolders and their contents
            }

            // Delete documents and their privileges within the current folder
            const [documentsToDelete] = await connection.query<RowDataPacket[]>('SELECT ID FROM documents WHERE folder_id = ?', [folderId]);
            for (const { ID: docId } of documentsToDelete) {
                await connection.query('DELETE FROM document_privileges WHERE DOCUMENT_ID = ?', [docId]);
                await connection.query('DELETE FROM documents WHERE ID = ?', [docId]);
            }

            // Delete folder privileges for the current folder
            await connection.query('DELETE FROM folder_privileges WHERE FOLDER_ID = ?', [folderId]);

            // Finally, delete the folder itself
            await connection.query('DELETE FROM folders WHERE ID = ?', [folderId]);
        }

        // Start the recursive deletion from the requested folder
        await deleteFolderAndContents(req.params.id, connection);

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