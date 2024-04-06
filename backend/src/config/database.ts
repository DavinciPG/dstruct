import mysql, { Pool, PoolConnection } from 'mysql2/promise';



import dotenv from 'dotenv'

dotenv.config();



const config: mysql.PoolOptions = {

    host: process.env.HOST,

    user: process.env.DATABASE_USER,

    password: process.env.PASSWORD,

    database: process.env.DATABASE,

    waitForConnections: true,

    queueLimit: 0,

    connectionLimit: 0,

};



const pool: Pool = mysql.createPool(config);



(async () => {

    try {
        const connection: PoolConnection = await pool.getConnection();

        console.log('Connected to MySQL database');



        connection.release();

    } catch (error) {

        console.error('Error connecting to database:', error);

    }

})();



export default pool;